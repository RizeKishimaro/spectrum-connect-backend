import { forwardRef, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import ManagerFactory from 'asterisk-manager';
import { AgentService } from 'src/agent/agent.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';

@Injectable()
export class SystemManagerService {
  private ami;

  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly parkedCallService: ParkedCallService
  ) {
    this.ami = ManagerFactory(
      5038,             // AMI port
      '127.0.0.1',      // Asterisk IP
      'ami_admin',          // Your AMI username
      'rootuser',  // Your AMI password
      true
    );


  }

  async getStatus(): Promise<any> {
    const coreShowChannels = await this.sendCommand('core show channels');
    const sipShowPeers = await this.sendCommand('sip show peers');
    const pjsipShowEndpoints = await this.sendCommand('pjsip show endpoints');
    const uptime = await this.sendCommand('core show uptime');

    return {
      coreShowChannels,
      sipShowPeers,
      pjsipShowEndpoints,
      uptime,
    };
  }

  async checkPing() {
    this.ami.keepConnected();
    const res = this.ami.action({
      action: "ping"
    })
    return res
  }

  async isPjsipUserOnline(extension: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const actionId = `check-pjsip-${Date.now()}`;
      let deviceState: string | undefined;

      const onRawEvent = (evt: any) => {
        if (evt.actionid !== actionId) return;

        switch (evt.event) {
          case 'EndpointDetail':
            deviceState = evt.devicestate?.toLowerCase();
            resolve(deviceState === 'not in use');
            break;

          case 'EndpointDetailComplete':
            this.ami.removeListener('rawevent', onRawEvent);
            resolve(deviceState === 'not in use');
            break;

        }
      };

      this.ami.on('rawevent', onRawEvent);

      this.ami.action({
        action: 'PJSIPShowEndpoint',
        endpoint: extension,
        actionid: actionId,
      }, (err) => {
        if (err) {
          this.ami.removeListener('rawevent', onRawEvent);
          reject(err);
        }
      });
    });
  }

  async sendCommand(cmd: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.ami.action(
        {
          Action: 'Command',
          Command: cmd,
        },
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.output || []);
          }
        }
      );
    });
  }

  // @Interval(10000)
  async autoBridgeParkedCalls() {
    const calls = await this.parkedCallService.getActiveParkedCalls();
    const agents = await this.agentService.getAvailableAgent();
    console.log(calls)

    if (calls.length && agents.length) {
      const call = calls[0];
      const agent = agents[0];
      const callChannel = call.sipChannel; // e.g. PJSIP/1001-00000006
      const agentChannel = `PJSIP/${agent.sipUname}`;

      console.log(`🌈 Bridging parked call ${call.sipChannel} to agent ${agent.sipUname}`);

      const data = await this.ami.action({
        Action: 'Redirect',
        Channel: callChannel,
        ExtraChannel: agentChannel,
        Context: 'local-endpoint',
        Exten: 's',
        Priority: 1,
      });
      console.log(data)

      this.parkedCallService.unparkCall(call.id)
    }
  }
}
