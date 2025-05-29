import { Global, Module } from "@nestjs/common";
import { AMIProvider } from "./ami-provider.service";

@Global()
@Module({
  providers: [AMIProvider],
  exports: [AMIProvider],
})
export class AmiModule { }
