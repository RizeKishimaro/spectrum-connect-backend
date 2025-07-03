
import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { SendSmsDto } from './dto/sms.dto'
import { randomBytes } from 'crypto';

@Injectable()
export class SmsService {
  constructor(@InjectQueue('sms') private smsQueue: Queue) { }

  generateBase64String(length: number): string {
    // Base64 expands every 3 bytes to 4 characters
    // So we need to calculate how many bytes are needed
    const byteLength = Math.ceil((length * 3) / 4);
    return randomBytes(byteLength).toString('base64').slice(0, length);
  }

  replaceRandomPlaceholders(message: string): string {
    return message
      .replace(/{{rad_6}}/g, () => this.generateBase64String(6))
      .replace(/{{rad_12}}/g, () => this.generateBase64String(12))
      .replace(/{{rad_32}}/g, () => this.generateBase64String(32))
      .replace(/{{rad_64}}/g, () => this.generateBase64String(64));
  }

  async sendSms(data) {
    const processedMessage = this.replaceRandomPlaceholders(data.content);

    await this.smsQueue.add('send', {
      ...data,
      message: processedMessage,
      API_KEY: process.env.SMS_API_KEY,
      API_ROUTE: process.env.SMS_API_URL
    });

    return { status: 'queued', data: { ...data, message: processedMessage } };
  }

}

