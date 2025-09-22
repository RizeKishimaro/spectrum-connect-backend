import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { ExpressRequest } from './types/other';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("call-stats")
  async getCallStats() {
    return this.appService.getCallStats()
  }

  @Get("agent-status")
  async getAgentStatus() {
    return this.appService.getAgentStatus()
  }

  @Get("recent-calls")
  async getRecentCalls() {
    return this.appService.getRecentCalls()
  }

  // dashboard.controller.ts
  @Get("summary")
  async getSummary(@Req() req: ExpressRequest) {
    return this.appService.getSummary(req.user.user.systemCompanyId)
  }
}
