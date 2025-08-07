import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { SmsProcessor } from './processors/sms.processor'
import { TeliqonProcessor } from './processors/teliqon.processor'
import { CommpeakProcessor } from './processors/commpeak.processor'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'limitless',
    }),
    BullModule.registerQueue({
      name: "teliqon"
    }),
    BullModule.registerQueue({
      name: "commpeak"
    })
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsProcessor, TeliqonProcessor, CommpeakProcessor],
})
export class SmsModule { }

