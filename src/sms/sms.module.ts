import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SmsService } from './sms.service'
import { SmsController } from './sms.controller'
import { SmsProcessor } from './processors/sms.processor'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sms',
    }),
  ],
  controllers: [SmsController],
  providers: [SmsService, SmsProcessor],
})
export class SmsModule { }

