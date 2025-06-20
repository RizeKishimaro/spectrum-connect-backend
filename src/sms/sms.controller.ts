
// sms.controller.ts
import { Controller, Get, Post, Query, Param, Body, Req } from '@nestjs/common'
import { SmsService } from './sms.service'
import { SendSmsDto } from './dto/sms.dto'
import { PaginationService } from 'src/utils/providers/pagination/pagination.service'
import { PrismaService } from 'src/utils/prisma/prisma.service'

@Controller('sms')
export class SmsController {
  constructor(
    private smsService: SmsService,
    private paginationService: PaginationService,
    private prisma: PrismaService, // adjust if using another ORM
  ) { }

  @Post('send')
  async sendSms(@Body() dto: SendSmsDto, @Req() req: any) {
    console.log(dto, req.user)
    const response = this.smsService.sendSms({
      companyId: req.user.user.systemCompanyId,
      route: dto.route,
      action: 'sendmessage',
      content: dto.message,
      numbers: dto.numbers,
      sender: dto.sender
    })
    return {
      status: "success",
      message: "Message Sent Successfully",
      response
    }
  }

  @Get()
  async getAllSms(@Query() query: any) {
    const data = await this.paginationService.paginate(this.prisma.smsLog, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      orderBy: { createdAt: 'desc' },
    })
    const returnData = {
      ...data,
      direction: "outbound"
    };
    return returnData
  }

  @Get(':id')
  async getSms(@Param('id') id: string) {
    return this.prisma.smsLog.findUnique({ where: { id } })
  }
}

