import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@Processor('commpeak', {
  concurrency: 5
})
export class CommpeakProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== 'send') {
      console.warn(`⚠️ Unknown job name: ${job.name}`);
      return;
    }

    const { numbers, message, smsLogId, billingDeduct, senderId } = job.data;
    const phone = numbers[0];

    try {
      const response = await axios.post(
        process.env.COMMPEAK_SMS_API_URL as string,
        {
          messages: [
            {
              sender: senderId,
              recipient_phone: phone,
              message_content: message,
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.COMMPEAK_SMS_API_KEY
          }
        }
      );

      console.log(`✅ Commpeak SMS sent to ${phone}`);
      console.log(response.data)

      await this.prisma.smsLog.update({
        where: { id: smsLogId },
        data: {
          status: "sent",
          charged: billingDeduct,
          apiRaw: response.data,
          success: 1,
          failed: 0
        }
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Commpeak SMS failed for ${phone}`, error?.response?.data || error.message);

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


