
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

    function handleSmsBilling(route: number, data: any) {
      const getRouteMultiplier = (route: number): number => {
        switch (route) {
          case 1: return 2;
          case 2: return 1.2;
          case 3:
          case 4:
          case 5:
          case 6:
          case 7:
          case 8: return 1.4286;
          default: return 1;
        }
      };

      const taxRate = 0.0028;
      const sent = route === 1
        ? data.success ?? 0
        : data.sent ?? (data.success === true ? 1 : 0);

      const failed = route === 1
        ? data.fail ?? 0
        : data.failed ?? (data.success === false ? 1 : 0);

      const baseCharged = parseFloat(data.charged ?? "0");
      const multiplier = getRouteMultiplier(route);
      const chargedBeforeTax = baseCharged * multiplier;
      const taxAmount = chargedBeforeTax * taxRate;
      const charged = parseFloat((chargedBeforeTax + taxAmount).toFixed(4)); // roundy-round ✨
      console.log(charged, baseCharged)

      const status = sent > 0 ? "sent" : "failed";

      return {
        sent,
        failed,
        charged,
        status
      };
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
      const { status, sent, charged, failed } = handleSmsBilling(route, data)


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


      if (status === 'sent') {
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
                decrement: charged,
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
  private calculateChargedByRoute(route: number, baseCharged: number): number {
    switch (route) {
      case 1:
        return baseCharged * 2;
      case 2:
        return baseCharged * 1.2;
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
        return baseCharged * 1.4286;
      default:
        return baseCharged;
    }
  }
}

