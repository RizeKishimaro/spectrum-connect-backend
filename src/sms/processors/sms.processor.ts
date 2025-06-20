
// sms.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Processor('sms') // 💖 Register this class as a worker for the "sms" queue
export class SmsProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    console.log("📡 Processing SMS job:", job.name, job.data);

    if (job.name !== 'send') {
      console.warn(`⚠️ Unknown job name: ${job.name}`);
      return;
    }
    console.log(job.data, process.env.SMS_API_KEY, process.env.SMS_API_URL)

    const { content, companyId, numbers, sender, route, API_KEY, API_ROUTE } = job.data;
    const url = `${API_ROUTE}?API_KEY=${API_KEY}&route=${route}
&action=sendmessage&numbers=${Array.isArray(numbers) ? numbers.join(',') : numbers}
&content=${encodeURIComponent(content)}
&sender=${sender}`;

    try {
      console.log("📡 Sending SMS:", url);
      const res = await axios.get(url);


      await this.prisma.smsLog.create({
        data: {
          sender,
          systemCompanyId: companyId,
          numbers: Array.isArray(numbers) ? numbers.join(',') : numbers,
          content,
          route,
          status:
            res.data.status === 1 || res.data.success === true
              ? "sent"
              : "failed",
          success: res.data.success ?? res.data.sent ?? 0,
          failed: res.data.fail ?? res.data.failed ?? 0,
          charged: parseFloat(res.data.charged ?? '0'),
          apiRaw: res.data,
          direction: "outbound",
        },
      });
      console.log("📡 SMS sent:",);

      // return res.data;
      return { status: 'sent', };
    } catch (err) {
      console.error('💥 SMS sending failed:', err);
      await this.prisma.smsLog.create({
        data: {
          sender,
          systemCompanyId: companyId,
          numbers: Array.isArray(numbers) ? numbers.join(',') : numbers,
          content,
          route,
          status: "failed",
          success: 0,
          failed: 1,
          charged: parseFloat(err.data.charged ?? '0'),
          apiRaw: err.data,
          direction: "outbound"
        },
      });

      throw err;
    }
  }
}

