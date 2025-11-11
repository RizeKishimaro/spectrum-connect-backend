import { Global, Module } from "@nestjs/common";
import { SmppSimboxProvider } from "./smpp-simbox.processor";
import { SmppWholesaleProvider } from "./smpp-wholesale.service";
import { SmppProvider } from "./smpp.service";
@Global()
@Module(
  {
    providers: [SmppProvider, SmppWholesaleProvider, SmppSimboxProvider],
    exports: [SmppProvider, SmppSimboxProvider, SmppWholesaleProvider]
  }
)
export class SmppProviderModule {

}
