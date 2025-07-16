import { Processor, WorkerHost } from '@nestjs/bullmq';
import axios from 'axios';
import { Job } from 'bullmq';
import dayjs from 'dayjs';
import { PrismaService } from 'src/utils/prisma/prisma.service';
interface SmsStateEntry {
  phone: string;
  id_state: string;
}
@Processor('teliqon', {
  concurrency: 10
})
export class TeliqonProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }



  // private extractSmsStates(apiData: any): SmsStateEntry[] {
  //   const result: SmsStateEntry[] = [];

  //   if (!apiData || !apiData.status || typeof apiData.data !== "object") {
  //     return result;
  //   }

  //   for (const [phone, stateArray] of Object.entries(apiData.data)) {
  //     if (Array.isArray(stateArray) && stateArray.length > 0) {
  //       result.push({
  //         phone,
  //         id_state: stateArray[0].id_state,
  //       });
  //     }
  //   }

  //   return result;
  // }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name !== "send") {
      console.log("Invalid Job name")
      return;
    }
    console.log("🟡 Processing job:", job.name, job.data)

    const {
      message,
      numbers,
      sender,
      smsLogId,
      smsLogs
    } = job.data;

    const payload = [
      {
        number: numbers,
        senderID: sender,
        text: message,
      }
    ];
    console.log(payload)

    try {

      const response = await axios.post(process.env.TELIQON_SMS_API_URL!, payload, {
        headers: {
          "X-Access-Token": process.env.TELIQON_SMS_API_KEY!,
          "Content-Type": "application/json"
        }
      });

      const results = response.data?.data || {};

      console.log(results)
      for (const { phone, logId } of smsLogs) {
        const idState = results[phone]?.[0]?.id_state;

        // 🧠 Basic logic: assume success if API returned id_state
        const isDelivered = !!idState;
        const status = isDelivered ? "sent" : "failed";
        console.log(status)
        const success = isDelivered ? 1 : 0;
        const failed = isDelivered ? 0 : 1;
        await this.prisma.smsLog.update({
          where: { id: logId },
          data: {
            status,
            success,
            failed,
            charged: 1, // Or your logic here
            apiRaw: results[phone],
          },
        });
        if (status === "sent") {
          // Find user from smsLog
          const logData = await this.prisma.smsLog.findUnique({
            where: { id: logId },
            select: {
              charged: true,
              systemCompanyId: true,
            },
          });

          const user = await this.prisma.user.findFirst({
            where: {
              systemCompany: {
                id: logData?.systemCompanyId,
              },
            },
            select: { id: true },
          });

          if (user) {
            await this.prisma.subscription.update({
              where: { userId: user.id },
              data: {
                smsBalance: {
                  decrement: Number(logData?.charged as number * 1.85) || 0,
                },
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("💥 SMS sending failed:", error.response?.data || error.message);

      await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: "failed",
          success: 0,
          failed: 1,
          charged: 0,
          apiRaw: error?.response?.data || { error: error.message },
        },
      });
      return {
        status: "error",
        reason: error?.response?.data || error.message,
      }
    }
  }
}
