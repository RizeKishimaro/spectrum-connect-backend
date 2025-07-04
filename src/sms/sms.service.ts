
import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { SendSmsDto } from './dto/sms.dto'
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class SmsService {
  constructor(
    @InjectQueue('limitless') private smsQueue: Queue,
    @InjectQueue('teliqon') private teliqonQueue: Queue,
    private readonly prisma: PrismaService
  ) { }

  generateBase64String(length: number): string {
    const byteLength = Math.ceil((length * 3) / 4);
    return randomBytes(byteLength).toString('base64').slice(0, length);
  }

  generateRandomInteger(digits: number): number {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  replaceRandomPlaceholders(message: string): string {
    return message
      .replace(/{{rad_6}}/g, () => this.generateBase64String(6))
      .replace(/{{rad_12}}/g, () => this.generateBase64String(12))
      .replace(/{{rad_32}}/g, () => this.generateBase64String(32))
      .replace(/{{rad_64}}/g, () => this.generateBase64String(64))
      .replace(/{{rad_i_(\d+)}}/g, (_, digits) => this.generateRandomInteger(parseInt(digits)).toString());
  }



  async sendSms(data) {
    const numberList = Array.isArray(data.numbers)
      ? data.numbers
      : typeof data.numbers === "string"
        ? data.numbers.split(",").map(n => n.trim())
        : [];

    if (numberList.length === 0) {
      throw new Error("No valid numbers provided nya~!");
    }

    const logs = await Promise.all(
      numberList.map(async (phone) => {
        const processedMessage = this.replaceRandomPlaceholders(data.content);
        const log = await this.prisma.smsLog.create({
          data: {
            sender: data.sender,
            systemCompanyId: data.companyId,
            numbers: phone,
            content: processedMessage,
            route: data.route,
            status: "pending",
            success: 0,
            failed: 0,
            charged: 0,
            apiRaw: {},
            direction: "outbound",
          },
        });
        return {
          phone,
          processedMessage,
          logId: log.id,
        };
      })
    );

    // 🌟 Use one message only (e.g., from first)
    const processedMessage = logs[0].processedMessage;

    await this.smsQueue.add("send", {
      ...data,
      numbers: logs.map(l => l.phone),
      message: processedMessage,
      smsLogs: logs.map(({ phone, logId }) => ({ phone, logId })),
      API_KEY: process.env.SMS_API_KEY,
      API_ROUTE: process.env.TELIQON_SMS_API_URL,
    });

    return {
      status: "queued",
      count: numberList.length,
    };
  }
  async sendTeliqon(data: any) {
    const numberList = Array.isArray(data.numbers)
      ? data.numbers
      : typeof data.numbers === "string"
        ? data.numbers.split(",").map((n) => n.trim()).filter(n => n.length > 0)
        : [];

    if (numberList.length === 0) {
      console.log("📵 Bad phone number list");
      throw new Error("No valid numbers provided nya~!");
    }



    const pendingLogs = await Promise.all(
      numberList.map(async (phone) => {
        const processedMessage = this.replaceRandomPlaceholders(data.content); // 💎 Generate unique per number
        const log = await this.prisma.smsLog.create({
          data: {
            sender: data.sender,
            systemCompanyId: data.companyId,
            numbers: phone,
            content: processedMessage,
            route: data.route,
            status: "pending",
            success: 0,
            failed: 0,
            charged: 0,
            apiRaw: {},
            direction: "outbound",
          },
        });

        return {
          phone,
          processedMessage,
          logId: log.id,
        };
      })
    );


    await this.smsQueue.add("send", {
      numbers: pendingLogs.map(log => log.phone),
      message: pendingLogs[0].processedMessage,
      smsLogs: pendingLogs.map(log => ({ phone: log.phone, logId: log.logId })),
      sender: data.sender,
      companyId: data.companyId,
      route: data.route,
      API_KEY: process.env.TELIQON_SMS_API_KEY,
      API_ROUTE: process.env.TELIQON_SMS_API_URL,
    });

    return {
      status: "queued",
      count: numberList.length,
    };
  }

}

