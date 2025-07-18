
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
      numbers, // single number string here!
      sender,
      route,
      smsLogId, // the log to update
    } = job.data;

    const url = `${process.env.SMS_API_URL}?API_KEY=${process.env.SMS_API_KEY}` +
      `&route=${route}` +
      `&action=sendmessage` +
      `&numbers=${encodeURIComponent(numbers)}` +
      `&content=${encodeURIComponent(message)}` +
      `&sender=${encodeURIComponent(sender)}`;


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
        status = sent > 0 ? "sent" : "failed";
      } else {
        sent = data.sent ?? (data.success === true ? 1 : 0);
        failed = data.failed ?? (data.success === false ? 1 : 0);
        charged = parseFloat(data.charged ?? "0");
        status = sent > 0 ? "sent" : "failed";
      }

      const smsData = await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status,
          success: sent,
          failed,
          charged,
          apiRaw: data,
        },
      });


      if (status === 'sent' && job.data.billingDeduct > 0) {
        const user = await this.prisma.user.findFirst({
          where: {
            systemCompany: {
              id: smsData.systemCompanyId,
            },
          },
        });

        if (user) {
          await this.prisma.subscription.update({
            where: { userId: user.id },
            data: {
              smsBalance: {
                decrement: job.data.billingDeduct,
              },
            },
          });
        }
      }

      console.log("📤 SMS sent successfully!");
      return { status: "sent" };

    } catch (err) {
      console.error("💥 SMS sending failed:", err);

      const smsData = await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: "failed",
          success: 0,
          failed: 1,
          charged: 0,
          apiRaw: err?.response?.data || {},
        },
      });

      // ❌ Failed case: no deduction!
      return {
        status: "error",
        reason: err?.response?.data || err.message,
      };
    }
  }
}

