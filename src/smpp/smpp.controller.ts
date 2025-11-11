import { Controller, Get, Query } from '@nestjs/common';
import { SmppService } from './smpp.service';

@Controller('smpp')
export class SmppController {

  constructor(private readonly smppService: SmppService) { }

  @Get()
  sendSmppRequest(@Query("number") number: string, @Query("content") content: string) {
    return this.smppService.sendSmppRequest(number, content)
  }

}
