
import { Injectable, OnModuleInit } from "@nestjs/common";
import * as smpp from "smpp";

type TransceiverProps = {
  number: string;
  content: string;
};

@Injectable()
export class SmppProvider implements OnModuleInit {
  public session: any;

  constructor() {
    this.session = null;
  }

  onModuleInit() {
    this.session = smpp.connect(
      {
        url: process.env.SMPP_URL,
        debug: true,
      },
      () => {
        // use arrow function to keep `this`
        this.session.bind_transceiver(
          {
            system_id: process.env.SMPP_USERNAME,
            password: process.env.SMPP_PASSWORD,
          },
          (pdu) => {
            if (pdu.command_status !== 0) {
              console.error("SMPP bind failed:", pdu);
              process.exit(1);
            } else {
              // this.sendSMPPtransceiverrequest({
              //   number: "959756761509",
              //   content: "Test SMS"
              // })
              console.log("SMPP connected & bound as transceiver ✅");
            }
          },
        );
      },
    );
  }

  sendSMPPtransceiverrequest(parameter: TransceiverProps) {
    if (!this.session) {
      throw new Error("SMPP session not initialized yet");
    }

    return this.session.submit_sm(
      {
        destination_addr: parameter.number,
        short_message: parameter.content,
      },
      (pdu) => {
        if (pdu.command_status === 0) {
          console.log("Message sent, ID:", pdu.message_id);
          return pdu;
        } else {
          console.error("Failed to send message:", pdu);
          return pdu
        }
      },
    );
  }
}

