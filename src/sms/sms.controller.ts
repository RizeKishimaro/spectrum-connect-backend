
// sms.controller.ts
import { Controller, Get, Post, Query, Param, Body, Req, BadRequestException } from '@nestjs/common'
import { SmsService } from './sms.service'
import { SendSmsDto } from './dto/sms.dto'
import { PaginationService } from 'src/utils/providers/pagination/pagination.service'
import { PrismaService } from 'src/utils/prisma/prisma.service'
import { BasicQuery } from 'src/utils/dto/query.dto'
import { ExpressRequest } from 'src/types/other'
import { randomUUID } from 'crypto'
import { PublicRoute } from 'src/utils/decorators/public.decorator'
import { Role } from '@prisma/client'

@Controller('sms')
export class SmsController {
  constructor(
    private smsService: SmsService,
    private paginationService: PaginationService,
    private prisma: PrismaService, // adjust if using another ORM
  ) { }
  @Post("smppsmsrequest/send")
  async sendSMS(@Body() dto: SendSmsDto, @Req() req: any) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: req.user.user.id
      }
    })
    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (!subscription.active) {
      throw new BadRequestException("Your Subscription has been deactivated.Please Contact Our Services")
    }
    if (subscription.smsBalance === 0) {
      throw new BadRequestException("Low Balance Please recharge!")
    }
    const response = this.smsService.sendSMPPSms({
      companyId: req.user.user.systemCompanyId,
      route: dto.route,
      action: 'sendmessage',
      content: dto.message,
      numbers: dto.numbers,
      sender: dto.sender
    })
    return {
      status: "queued",
      message: "Message Sent Successfully",
      response
    }
  }

  @Post('limitless/send')
  async sendSms(@Body() dto: SendSmsDto, @Req() req: any) {

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: req.user.user.id
      }
    })
    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (!subscription.active) {
      throw new BadRequestException("Your Subscription has been deactivated.Please Contact Our Services")
    }
    if (subscription.smsBalance === 0) {
      throw new BadRequestException("Low Balance Please recharge!")
    }
    const response = this.smsService.sendSms({
      companyId: req.user.user.systemCompanyId,
      route: dto.route,
      action: 'sendmessage',
      content: dto.message,
      numbers: dto.numbers,
      sender: dto.sender
    })
    return {
      status: "queued",
      message: "Message Sent Successfully",
      response
    }
  }

  @Post('topying/send')
  async sendTopyig(@Body() dto: SendSmsDto, @Req() req: any) {

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: req.user.user.id
      }
    })
    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (!subscription.active) {
      throw new BadRequestException("Your Subscription has been deactivated.Please Contact Our Services")
    }
    if (subscription.smsBalance === 0) {
      throw new BadRequestException("Low Balance Please recharge!")
    }
    const response = this.smsService.sendTopying({
      companyId: req.user.user.systemCompanyId,
      route: dto.route,
      action: 'sendmessage',
      content: dto.message,
      numbers: dto.numbers,
      sender: dto.sender
    })
    return {
      status: "queued",
      message: "Message Sent Successfully",
      response
    }
  }
  @Post('commpeak/send')
  async sendCommpeakSMS(@Body() dto: SendSmsDto, @Req() req: any) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: req.user.user.id
      }
    })
    if (!subscription) {
      throw new BadRequestException('Subscription not found')
    }
    if (subscription.smsBalance === 0) {
      throw new BadRequestException("Low Balance Please recharge!")
    }
    const response = this.smsService.sendSMPPSms({
      companyId: req.user.user.systemCompanyId,
      route: dto.route,
      action: 'sendmessage',
      content: dto.message,
      numbers: dto.numbers,
      sender: dto.sender
    })
    return response
  }




  @PublicRoute()
  @Get("limitless/test")
  fakeSendSMS(
    @Query('API_KEY') apiKey: string,
    @Query('route') route: string,
    @Query('action') action: string,
    @Query('numbers') numbers: string,
    @Query('content') content: string,
    @Query('sender') sender: string,
  ) {
    if (action === 'checkprice') {
      return {
        status: 0,
        prices: [
          {
            route: 1,
            country: 'Argentina',
            country_number: '54',
            price: 0.135,
            type: 'Shortcode',
          },
          {
            route: 1,
            country: 'Australia',
            country_number: '61',
            price: 0.1125,
            type: 'Open Sender ID',
          },
          {
            route: 2,
            country: 'Myanmar',
            country_number: '95',
            price: 0.08,
            type: 'Alphanumeric',
          },
        ],
      };

    }

    if (action !== 'sendmessage') {
      return {
        success: false,
        message: 'Invalid action~! Only sendmessage is supported nya~!',
      };
    }

    const numberList = numbers.split(',').map(n => n.trim());

    // Simulate different responses by route~!
    if (route === '1') {
      return {
        status: 0,
        array: numberList,
        success: numberList.length,
        fail: 0,
        charged: (numberList.length * 0.07).toFixed(2),
      };
    } else {
      return {
        success: true,
        sent: numberList.length,
        failed: 0,
        charged: (numberList.length * 0.05).toFixed(2),
      };
    }
  }




  @PublicRoute()
  @Post("teliqon/test")
  async testSend(@Body() body: any) {
    console.log("📥 Received body:", JSON.stringify(body, null, 2));

    const data: Record<string, any[]> = {};

    const messages = Array.isArray(body) ? body : [body];

    for (const item of messages) {
      const numbers = Array.isArray(item.number)
        ? item.number
        : typeof item.number === "string"
          ? [item.number]
          : [];

      for (const number of numbers) {
        data[number] = [
          {
            id_state: randomUUID(), // Simulate delivery status
          },
        ];
      }
    }

    return {
      status: true,
      data,
    };
  }

  @Get()
  async getAllSms(
    @Query() query: BasicQuery,
    @Req() req: any
  ) {
    const user = req.user.user; // assuming auth middleware attaches `user`


    if ('roles' in req.user.user && req.user.user.roles === Role.admin) {
      console.log("💥 Admin-chan has logged in!");
    }

    const where = user.roles !== "admin"
      ? { systemCompanyId: user.systemCompanyId }
      : {};

    const data = await this.paginationService.paginate(
      {
        ...query,
        sortField: "id",
        sortType: "desc"
      },
      this.prisma.smsLog,
      ["sender", "numbers", "content"],
      {},
      where
    );

    return {
      ...data,
      direction: "outbound",
    };
  }

  @Get(':id')
  async getSms(@Param('id') id: string) {
    return this.prisma.smsLog.findUnique({ where: { id } })
  }
}

