
import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { SendSmsDto } from './dto/sms.dto'

@Injectable()
export class SmsService {
  constructor(@InjectQueue('sms') private smsQueue: Queue) { }

  async sendSms(data) {
    await this.smsQueue.add('send', {
      ...data,
      API_KEY: process.env.SMS_API_KEY,
      API_ROUTE: process.env.SMS_API_URL
    })
    return { status: 'queued', data }
  }
}

