
import { Injectable, OnModuleInit } from "@nestjs/common";
import * as smpp from "smpp";

@Injectable()
export class SmppProvider implements OnModuleInit {
  public session: any;

  onModuleInit() {
    try {
      this.session = smpp.connect({ url: process.env.SMPP_URL });

      this.session.bind_transceiver(
        {
          system_id: process.env.SMPP_USERNAME,
          password: process.env.SMPP_PASSWORD,
        },
        (pdu) => {
          if (pdu.command_status !== 0) {
            console.error("❌ SMPP bind failed:", pdu);
          } else {
            console.log("✅ SMPP connected & bound as transceiver");
            return
          }
        },
      );

      this.session.on("deliver_sm", (pdu) => {
        this.session.emit("dlr", pdu);
      });
    } catch (e) {
      console.error(e)
    }
  }
}

