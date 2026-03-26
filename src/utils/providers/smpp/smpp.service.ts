
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import * as smpp from "smpp";

@Injectable()
export class SmppProvider implements OnModuleInit {
  public session: any;
  constructor(@InjectQueue("dlrQueue") private readonly dlrQueue: Queue) { }
  onModuleInit() {
    // try {
    //   this.session = smpp.connect({ url: process.env.SMPP_URL });
    //
    //   this.session.bind_transceiver(
    //     {
    //       system_id: process.env.SMPP_USERNAME,
    //       password: process.env.SMPP_PASSWORD,
    //     },
    //     (pdu) => {
    //       if (pdu.command_status !== 0) {
    //         console.error("❌ SMPP bind failed:", pdu);
    //       } else {
    //         console.log("✅ SMPP connected & bound as transceiver");
    //         return
    //       }
    //     },
    //   );
    //
    //
    //   this.session.on("deliver_sm", async (pdu) => {
    //     // 🩵 Normalize short_message
    //     let msg = "";
    //     if (typeof pdu.short_message === "string") {
    //       msg = pdu.short_message;
    //     } else if (pdu.short_message?.message) {
    //       msg = pdu.short_message.message; // handle { message: "..." }
    //     } else if (Buffer.isBuffer(pdu.short_message)) {
    //       msg = pdu.short_message.toString("utf8");
    //     } else {
    //       msg = String(pdu.short_message ?? "");
    //     }
    //
    //     // 🌸 Extract id/stat safely
    //     const idMatch = msg.match(/id:([0-9A-Fa-f]+)/i);
    //     const statMatch = msg.match(/stat:([A-Z]+)/i);
    //
    //     const id = idMatch ? idMatch[1] : null;
    //     const stat = statMatch ? statMatch[1] : "UNKNOWN";
    //
    //     console.log(`💌 Parsed DLR → id:${id}, stat:${stat}, raw:"${msg}"`);
    //
    //     if (!id) return;
    //
    //     const finalStatus =
    //       stat === "DELIVRD"
    //         ? "DELIVERED"
    //         : stat === "UNDELIV"
    //           ? "FAILED"
    //           : stat;
    //
    //     await this.dlrQueue.add("dlrUpdate", { messageId: id, status: finalStatus });
    //   });
    //
    // } catch (e) {
    //   console.error(e)
    // }
  }
}
