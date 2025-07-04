
// sms.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Processor('limitless', {
  concurrency: 10
})
export class SmsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== "send") {
      console.warn(`⚠️ Unknown job name: ${job.name}`);
      return;
    }

    const {
      message,
      companyId,
      numbers,
      sender,
      route,
      API_KEY,
      smsLogs, // { phone, logId }[]
    } = job.data;

    const url = `${process.env.SMS_API_URL}?API_KEY=${API_KEY}` +
      `&route=${route}` +
      `&action=sendmessage` +
      `&numbers=${encodeURIComponent(numbers.join(","))}` +
      `&content=${encodeURIComponent(message)}` +
      `&sender=${encodeURIComponent(sender)}`;
    console.log(url)

    try {
      const res = await axios.get(url);
      const data = res.data;

      let sent = 0;
      let failed = 0;
      let charged = 0;
      let status = "failed";

      if (route === 1) {
        sent = data.success ?? 0;
        failed = data.fail ?? 0;
        charged = parseFloat(data.charged ? (data.charged * 2).toString() : "0");
        status = sent > 0 ? "delivered" : "failed";
      } else {
        sent = data.sent ?? (data.success === true ? 1 : 0);
        failed = data.failed ?? (data.success === false ? 1 : 0);
        charged = parseFloat(data.charged ?? "0");
        status = sent > 0 ? "delivered" : "failed";
      }
      console.log(sent, failed, charged, status)

      // Update single SMS log status

      const responsePhones = Array.isArray(data.array) ? data.array : numbers;

      for (const { phone, logId } of smsLogs) {
        const sent = responsePhones.includes(phone) ? 1 : 0;
        const failed = sent === 0 ? 1 : 0;

        await this.prisma.smsLog.update({
          where: { id: logId },
          data: {
            status: sent ? "sent" : "failed",
            success: sent,
            failed,
            charged: parseFloat(data.charged ?? "0"),
            apiRaw: data,
          },
        });
      }

      console.log("sms sent")
      return { status: "sent" };

    } catch (err) {
      console.error("💥 SMS sending failed:", err.response.data || err.data);

      for (const { phone, logId } of smsLogs) {
        await this.prisma.smsLog.update({
          where: { id: logId },
          data: {
            status: "failed",
            success: 0,
            failed: 1,
            charged: 0,
            apiRaw: err?.response?.data || {},
          },
        });
      }

      const firstSmsLog = await this.prisma.smsLog.findFirst({
        where: { id: smsLogs[0]?.logId },
      });

      if (firstSmsLog) {
        const user = await this.prisma.user.findFirst({
          where: {
            systemCompany: {
              id: firstSmsLog.systemCompanyId,
            },
          },
        });

        if (user) {
          await this.prisma.subscription.update({
            where: {
              userId: user.id,
            },
            data: {
              smsBalance: {
                decrement: 0, // Nothing charged in failure, but still here just in case
              },
            },
          });
        }
      }

      return {
        status: "error",
        reason: err?.response?.data || err.message,
      };
    }
  }
}

