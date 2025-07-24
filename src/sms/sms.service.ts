
import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { SendSmsDto } from './dto/sms.dto'
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import axios from 'axios';

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
      console.log("bad phone number")
      throw new Error("No valid numbers provided nya~!");
    }

    const pendingLogs = await Promise.all(

      numberList.map(async (phone) => {
        const processedMessage = this.replaceRandomPlaceholders(data.content);
        console.log(processedMessage)
        return await this.prisma.smsLog.create({
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
        })
      })
    );
    console.log(pendingLogs)


    const pricingList = await axios.get(
      `${process.env.SMS_API_URL}?API_KEY=${process.env.SMS_API_KEY}&action=checkprice`
    ).then(res => {
      console.log(res.data)
      return res.data.prices
    });
    console.log(pricingList)

    // Add markup here (1.2x for example)
    const markupMultiplier = 1.2;

    for (let i = 0; i < numberList.length; i++) {
      const { numbers, content, id } = pendingLogs[i];
      const phone = numbers;

      const countryCode = phone.replace('+', '').slice(0, 3); // You might want a better country code extractor
      const route = data.route;

      const priceEntry = pricingList.find(
        p => p.route === route && phone.startsWith(p.country_number)
      );

      let rawPrice = priceEntry?.price ?? 0;
      let finalPrice = parseFloat((rawPrice * markupMultiplier).toFixed(4));

      await this.smsQueue.add("send", {
        ...data,
        numbers: [phone],
        message: content,
        API_KEY: process.env.SMS_API_KEY,
        API_ROUTE: process.env.TELIQON_SMS_API_URL,
        smsLogId: id,
        rawPrice,
        markupMultiplier,
        billingDeduct: finalPrice,
      });
    }

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

    // ⏳ Queue one job per number, with its own message
    for (let i = 0; i < pendingLogs.length; i++) {
      const { phone, processedMessage, logId } = pendingLogs[i];
      console.log(`📤 Queuing SMS to ${phone}`);
      await this.teliqonQueue.add("send", {
        ...data,
        numbers: [phone],
        message: processedMessage,
        accessToken: process.env.TELEQON_SMS_API_KEY,
        API_ROUTE: process.env.TELIQON_SMS_API_URL,
        smsLogId: logId,
      }, {
        delay: 10000
      });
    }
    return {
      status: "queued",
      count: numberList.length,
    };
  }

}

