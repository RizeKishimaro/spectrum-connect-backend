import { Module } from '@nestjs/common';
import { SmppService } from './smpp.service';
import { SmppController } from './smpp.controller';

@Module({
  controllers: [SmppController],
  providers: [SmppService],
})
export class SmppModule {}
