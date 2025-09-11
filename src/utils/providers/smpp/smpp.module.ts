import { Global, Module } from "@nestjs/common";
import { SmppProvider } from "./smpp.service";
@Global()
@Module(
  {
    providers: [SmppProvider],
    exports: [SmppProvider]
  }
)
export class SmppProviderModule {

}
