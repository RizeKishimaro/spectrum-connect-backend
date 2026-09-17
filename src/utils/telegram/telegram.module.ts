import { Global, Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { ConfigService } from "@nestjs/config";

@Global()
@Module({
  providers: [TelegramService, ConfigService],
  exports: [TelegramService],
})
export class TelegramModule { }
