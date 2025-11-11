import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { SmsProcessor } from './processors/sms.processor'
import { CommpeakProcessor } from './processors/commpeak.processor'
import { TopyingProcessor } from './processors/topying.processor'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'limitless',
    }),
    BullModule.registerQueue({
      name: "commpeak"
    }),
    BullModule.registerQueue({
      name: "topying"
    }),
    BullModule.registerQueue({
      name: "smppQueue"
    })
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsProcessor, CommpeakProcessor, TopyingProcessor],
})
export class SmsModule { }

