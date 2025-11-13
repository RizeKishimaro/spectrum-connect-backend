import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { SmsProcessor } from './processors/sms.processor'
import { CommpeakProcessor } from './processors/commpeak.processor'
import { TopyingProcessor } from './processors/topying.processor'
import { SmppProviderModule } from 'src/utils/providers/smpp/smpp.module'
import { SMPPSmsConsumer } from './processors/smpp.processor'
import { DLRConsumer } from 'src/utils/providers/smpp/dlr.processor'

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'limitless' },
      { name: "smppQueue" },
      { name: "dlrQueue" },
      { name: "commpeak" },
      { name: "topying" }
    ),
    SmppProviderModule
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsProcessor, CommpeakProcessor, TopyingProcessor, SMPPSmsConsumer, DLRConsumer],
})
export class SmsModule { }

