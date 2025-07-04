
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

@Controller('sms')
export class SmsController {
  constructor(
    private smsService: SmsService,
    private paginationService: PaginationService,
    private prisma: PrismaService, // adjust if using another ORM
  ) { }

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
  @Post("teliqon/send")
  async sendTeliqonSMS(@Body() dto: SendSmsDto, @Req() req: ExpressRequest) {
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

    const response = this.smsService.sendTeliqon({
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
  async testSend(@Body() body: SendSmsDto) {
    const numbers = Array.isArray(body.numbers)
      ? body.numbers
      : typeof body.numbers === 'string'
        ? [body.numbers]
        : ['12345678901'];

    const data = {};

    for (const number of numbers) {
      data[number] = [
        {
          id_state: randomUUID(),
        },
      ];
    }

    return {
      status: true,
      data,
    };
  }



  @Get()
  async getAllSms(
    @Query() query: BasicQuery,
    @Req() req: ExpressRequest
  ) {
    const user = req.user.user; // assuming auth middleware attaches `user`

    const where = user?.systemCompanyId
      ? { systemCompanyId: user.systemCompanyId }
      : {};

    const data = await this.paginationService.paginate(
      query,
      this.prisma.smsLog,
      ["sender", "numbers", "content"],
      {},
      where
    );
    console

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

