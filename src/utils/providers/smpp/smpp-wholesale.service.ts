
import { Injectable, OnModuleInit } from "@nestjs/common";
import * as smpp from "smpp";

@Injectable()
export class SmppWholesaleProvider implements OnModuleInit {
  public session: any;

  onModuleInit() {
    this.session = smpp.connect({ url: process.env.SMPP_URL });
    console.log({
      url: process.env.SMPP_URL,
      user: process.env.SMPP_WHOLESALE_USERNAME,
      pass: process.env.SMPP_WHOLESALE_PASSWORD,
    });


    this.session.bind_transceiver(
      {
        system_id: process.env.SMPP_WHOLESALE_USERNAME,
        password: process.env.SMPP_WHOLESALE_PASSWORD,
      },
      (pdu) => {
        if (pdu.command_status !== 0) {
          console.error("❌ SMPP bind failed:", pdu);
          process.exit(1);
        } else {
          console.log("✅ SMPP Wholesale connected & bound as transceiver");
        }
      },
    );

    // Just emit events — logic handled elsewhere
    this.session.on("deliver_sm", (pdu) => {
      this.session.emit("dlr", pdu);
    });
  }
}

