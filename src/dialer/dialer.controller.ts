import { Body, Controller, Param, Post } from '@nestjs/common';
import { StartDialDto } from './dto/start-dial.dto';
import { StopDialDto } from './dto/stop-dial.dto';
import { DialerService } from './dialer.service';


@Controller('dialer')
export class DialerController {
  constructor(private readonly dialer: DialerService) { }


  @Post('agent/:agentId/start')
  async start(@Param('agentId') agentId: string, @Body() dto: StartDialDto) {
    return this.dialer.startAgentDial(agentId, dto);
  }


  @Post('agent/:agentId/stop')
  async stop(@Param('agentId') agentId: string, @Body() dto: StopDialDto) {
    return this.dialer.stopAgentDial(agentId, dto.reason ?? 'user');
  }
}
