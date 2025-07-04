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
      accessToken,
      API_ROUTE,
    } = job.data;
    const futureTime = dayjs().add(10, 'seconds');
    const beginDate = futureTime.format('YYYY-MM-DD');
    const beginTime = futureTime.format('HH:mm:ss');

    const payload = {
      number: [numbers],
      senderID: sender,
      text: message,
      type: "sms",
      beginDate: beginDate,
      beginTime: beginTime,
      lifetime: 86400,
      delivery: false,
    };


    try {
      const res = await axios.post(process.env.TELIQON_SMS_API_URL as string, payload, {
        headers: {
          "X-Access-Token": accessToken,
          'Content-Type': 'application/json',
        },
      });

      const data = res.data;
      console.log("🟢 SMS API responded:", data);
      if (data.status === true && typeof data.data === "object") {
        for (const [phone, stateArray] of Object.entries(data.data)) {
          const id_state = Array.isArray(stateArray) && stateArray[0]?.id_state;

          if (id_state) {
            const smsData = await this.prisma.smsLog.update({
              where: { id: smsLogId },
              data: {
                status: "delivered",
                success: data.success,
                failed: 0,
                charged: 0.5,
                apiRaw: data,
              },
            });
            const user = await this.prisma.user.findFirst({
              where: {
                systemCompany: {
                  id: smsData.systemCompanyId
                }
              }
            })
            await this.prisma.subscription.update({
              where: {
                userId: user?.id
              },
              data: {
                smsBalance: {
                  decrement: smsData.charged || 0
                }
              }
            })
          }
        }
      }
    } catch (err) {
      console.error("💥 SMS sending failed:", err.response?.data || err.message);

      await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: "failed",
          success: 0,
          failed: 1,
          charged: 0,
          apiRaw: err?.response?.data || { error: err.message },
        },
      });

      throw err;
    }
  }
}
