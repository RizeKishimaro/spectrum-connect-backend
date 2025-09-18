import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

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
  async getSummary() {
    return this.appService.getSummary()
  }
}
