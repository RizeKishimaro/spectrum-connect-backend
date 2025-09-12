import { Global, Module } from "@nestjs/common";
import { SmppProvider } from "./smpp.service";
import { SmppSimboxProvider } from "./smpp-simbox.processor";
import { SmppWholesaleProvider } from "./smpp-wholesale.service";
@Global()
@Module(
  {
    providers: [SmppProvider, SmppWholesaleProvider, SmppSimboxProvider],
    exports: [SmppProvider, SmppSimboxProvider, SmppWholesaleProvider]
  }
)
export class SmppProviderModule {

}
