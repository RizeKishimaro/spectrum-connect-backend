import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ParkedCallService } from './parked-call.service';

@Controller('parked-call')
export class ParkedCallController {
  constructor(private readonly parkedCallService: ParkedCallService) { }

  @Get()
  getAll() {
    return this.parkedCallService.getActiveParkedCalls();
  }

  @Post(':id/unpark')
  unpark(@Param('id') id: string) {
    return this.parkedCallService.unparkCall(id);
  }
}

