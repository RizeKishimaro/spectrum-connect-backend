
// src/sip/sip-log.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SipLogService } from './sip-log.service';

@Controller('sip-logs')
export class SipLogController {
  constructor(private readonly sipLogService: SipLogService) { }

  @Get()
  async getAll(@Query('limit') limit?: string) {
    return this.sipLogService.findAll(Number(limit) || 100);
  }
}

