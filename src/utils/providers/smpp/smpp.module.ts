import { Global, Module } from "@nestjs/common";
import { SmppSimboxProvider } from "./smpp-simbox.processor";
import { SmppWholesaleProvider } from "./smpp-wholesale.service";
import { SmppProvider } from "./smpp.service";
import { BullModule } from "@nestjs/bullmq";
import { DLRConsumer } from "./dlr.processor";
@Global()
@Module(
  {
    imports: [
      BullModule.registerQueue({
        name: "dlrQueue"
      })
    ],
    providers: [SmppProvider, SmppWholesaleProvider, SmppSimboxProvider, DLRConsumer],
    exports: [SmppProvider, SmppSimboxProvider, SmppWholesaleProvider]
  }
)
export class SmppProviderModule {

}
