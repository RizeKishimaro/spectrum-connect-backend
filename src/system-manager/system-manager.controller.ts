import { Controller, Get, Query } from '@nestjs/common';
import { SystemManagerService } from './system-manager.service';

@Controller('system-manager')
export class SystemManagerController {
  constructor(private readonly systemManagerService: SystemManagerService) { }
  @Get('asterisk/status')
  async getAsteriskStatus() {
    const channels = await this.systemManagerService.sendCommand('core show channels');
    const uptime = await this.systemManagerService.sendCommand('core show uptime');
    const pjsipPeers = await this.systemManagerService.sendCommand('pjsip show endpoints');
    const systemVersion = await this.systemManagerService.sendCommand('core show version');
    const response = await this.systemManagerService.checkPing()

    return {
      systemVersion,
      uptime,
      activeCalls: channels,
      pjsipPeers,
      response
    };
  }


}
