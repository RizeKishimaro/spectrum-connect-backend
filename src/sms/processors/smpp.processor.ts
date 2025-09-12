
// sms.consumer.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { SmppProvider } from 'src/utils/providers/smpp/smpp.service';

@Processor('smpp-sms')
@Injectable()
export class SMPPSmsConsumer extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smppProvider: SmppProvider, // connection manager
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { sender, numbers, content, route, systemCompanyId } = job.data;
    console.log(sender, numbers, content, route, systemCompanyId)

    function safeJson(data: any) {
      try {
        return JSON.parse(JSON.stringify(data));
      } catch (e) {
        return { error: "Serialization failed", raw: String(e) };
      }
    }
    let status = 'FAILED';
    let success = 0;
    let failed = 1;
    let apiRaw: any = {};


    try {
      console.log(numbers)
      const pdu = await new Promise((resolve, reject) => {
        this.smppProvider.session.submit_sm(
          {
            source_addr: "SMS",
            destination_addr: numbers,
            short_message: content,
          },
          (pdu) => {
            if (pdu.command_status === 0) {
              resolve(pdu);
            } else {
              reject(pdu);
            }
          },
        );
      });

      status = 'sent';
      success = 1;
      failed = 0;
      apiRaw = safeJson(pdu); // ✅ ensure it's JSON-safe
    } catch (err) {
      console.log(err);
      status = 'FAILED';
      apiRaw = safeJson(err); // ✅ serialize errors too
    }

    console.log(status, success, failed, apiRaw)

    try {

      await this.prisma.smsLog.create({
        data: {
          sender,
          numbers,
          content,
          route: 1,
          status,
          success,
          failed,
          service: 'SMPP',
          apiRaw,
          systemCompanyId,
          direction: 'OUTBOUND',
        },
      });
    } catch (e) {
      console.log(e)
    }
    return { status, numbers };
  }
}

