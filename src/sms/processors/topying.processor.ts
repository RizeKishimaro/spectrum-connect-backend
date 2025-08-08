
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@Processor('topying', {
  concurrency: 5
})
export class TopyingProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== 'send') {
      console.warn(`⚠️ Unknown job name: ${job.name}`);
      return;
    }

    const { numbers, message, smsLogId, billingDeduct, sender } = job.data;
    const phone = numbers.join(','); // Topying uses comma-separated numbers!

    try {
      const response = await axios.post(
        `${process.env.TOPYING_SMS_API_URL}/sendsms`,
        {
          account: process.env.TOPYING_SMS_API_USERNAME,
          password: process.env.TOPYING_SMS_API_PASSWORD,
          content: message,
          smstype: 0,
          sender: sender || "",
          numbers: phone
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Topying SMS sent to ${phone}`);
      console.log(response.data);

      const { status } = response.data;

      const isSuccess = status === 0;

      await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: isSuccess ? "sent" : "failed",
          charged: isSuccess ? billingDeduct : 0,
          apiRaw: response.data,
          success: isSuccess ? 1 : 0,
          failed: isSuccess ? 0 : 1
        }
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Topying SMS failed for ${phone}`, error?.response?.data || error.message);

      await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: "failed",
          apiRaw: error?.response?.data || error.message,
          success: 0,
          failed: 1
        }
      });

      throw error;
    }
  }
}

