import { Module } from '@nestjs/common';
import { SmppService } from './smpp.service';
import { SmppController } from './smpp.controller';
import { SmppProvider } from 'src/utils/providers/smpp/smpp.service';

@Module({
  controllers: [SmppController],
  providers: [SmppService, SmppProvider],
})
export class SmppModule { }
