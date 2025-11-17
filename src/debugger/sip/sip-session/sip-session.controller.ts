import { Controller, Get, Param, Query } from '@nestjs/common';
import { SipSessionService } from './sip-session.service';

@Controller('sip-sessions')
export class SipSessionController {
  constructor(private readonly service: SipSessionService) { }

  @Get()
  async list() {
    return this.service.getAllSessions();
  }
  @Get('live')
  async getLiveQosData(@Query('limit') limit: number = 10) {
    const numLimit = parseInt(limit as any, 10);

    // This calls the method we added above
    const reports = await this.service.getLatestQosReports(numLimit);

    // Filter and format the data slightly for the frontend
    return reports.map(report => ({
      id: report.id,
      callId: report.session.callId,
      type: report.reportType,
      txPackets: report.packetsTransmitted,
      lostPackets: report.packetsLost,
      jitter: report.jitterMs,
      rtt: report.rttMs,
      mos: report.mos,
      timestamp: report.createdAt,
    }));
  }

  @Get(':id')
  async session(@Param('id') id: string) {
    return this.service.getSession(Number(id));
  }
}

