
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "src/utils/prisma/prisma.service";
import { SmppSimboxProvider } from "src/utils/providers/smpp/smpp-simbox.processor";
import { SmppWholesaleProvider } from "src/utils/providers/smpp/smpp-wholesale.service";
import { SmppProvider } from "src/utils/providers/smpp/smpp.service";

@Processor("smppQueue")
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
    // 🩵 we can support both "send" and "dlr" tasks
    if (job.name === "dlr") return this.handleDLR(job.data);
    return this.handleSend(job.data);
  }

  // 🌸 sending SMS logic
  private async handleSend(data: any) {
    const { sender, numbers, content, route, systemCompanyId } = data;
    let provider: any;

    switch (route) {
      case "wholesale":
        provider = this.smppWholesaleProvider;
        break;
      case "simbox":
        provider = this.smppSimboxProvider;
        break;
      default:
        provider = this.smppProvider;
        break;
    }

    const safeJson = (d: any) => {
      try {
        return JSON.parse(JSON.stringify(d));
      } catch (e) {
        return { error: "Serialization failed", raw: String(e) };
      }
    };

    let status = "FAILED";
    let success = 0;
    let failed = 1;
    let apiRaw: any = {};
    let messageId: string | null = null;

    try {
      const pdu = await new Promise((resolve, reject) => {
        provider.session.submit_sm(
          {
            source_addr: sender,
            destination_addr: numbers,
            source_addr_ton: 5,
            source_addr_npi: 0,
            dest_addr_ton: 1,
            dest_addr_npi: 1,
            short_message: content,
          },
          (pdu) => (pdu.command_status === 0 ? resolve(pdu) : reject(pdu)),
        );
      });
      console.log(pdu)

      status = "SENT";
      success = 1;
      failed = 0;
      apiRaw = safeJson(pdu);
      messageId = (pdu as any).message_id ?? null;
      const pduData = await this.prisma.smsLog.create({
        data: {
          sender,
          numbers,
          content,
          route,
          messageId,
          status,
          success,
          failed,
          service: "SMPP",
          apiRaw,
          systemCompanyId,
          direction: "OUTBOUND",
        },
      });

      console.log(pduData)
    } catch (err) {
      console.error("❌ SMPP send error:", err);
      const pduData = await this.prisma.smsLog.create({
        data: {
          sender,
          numbers,
          content,
          route,
          messageId,
          status,
          success,
          failed,
          service: "SMPP",
          apiRaw,
          systemCompanyId,
          direction: "OUTBOUND",
        },
      });
      apiRaw = safeJson(err);
    }
    console.log(messageId)



    return { status, numbers };
  }

  // 💌 delivery-report handler (runs from same queue)
  private async handleDLR(data: any) {
    const { messageId, status } = data;
    console.log(`💌 Processing DLR → ${messageId} (${status})`);

    const finalStatus =
      status === "DELIVRD"
        ? "DELIVERED"
        : status === "UNDELIV"
          ? "FAILED"
          : status;

    try {
      const updated = await this.prisma.smsLog.updateMany({
        where: { messageId },
        data: { status: finalStatus },
      });
      if (updated.count === 0) {
        console.warn(`⚠️ No log found for messageId ${messageId}`);
      } else {
        console.log(`✅ Updated message ${messageId} → ${finalStatus}`);
      }
    } catch (e) {
      console.error("❌ Failed to update DLR:", e);
      throw e; // Let BullMQ retry
    }
  }
}

