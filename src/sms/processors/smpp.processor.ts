
// sms.consumer.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { SmppProvider } from 'src/utils/providers/smpp/smpp.service';
import { SmppWholesaleProvider } from 'src/utils/providers/smpp/smpp-wholesale.service';
import { SmppSimboxProvider } from 'src/utils/providers/smpp/smpp-simbox.processor';

@Processor('smpp-sms')
@Injectable()
export class SMPPSmsConsumer extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smppProvider: SmppProvider,
    private readonly smppWholesaleProvider: SmppWholesaleProvider,
    private readonly smppSimboxProvider: SmppSimboxProvider
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
            source_addr: sender, // Sender ID
            destination_addr: numbers, // Recipient

            // TON/NPI for source
            source_addr_ton: 5, // 5 = Alphanumeric (for sender ID "SMS")
            source_addr_npi: 0, // 0 = Unknown

            // TON/NPI for destination
            dest_addr_ton: 1, // 1 = International (E.164 numbers)
            dest_addr_npi: 1, // 1 = ISDN (E.164)

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

