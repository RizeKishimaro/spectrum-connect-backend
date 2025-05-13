
// // ami.service.ts
// import { Injectable } from '@nestjs/common';
// import AsteriskManager from 'asterisk-manager';

// @Injectable()
// export class AsteriskService {
//   private ami;

//   constructor() {
//     this.ami = new AsteriskManager(
//       5038,             // AMI port
//       '127.0.0.1',      // Asterisk IP
//       'admin',          // Your AMI username
//       'your_password',  // Your AMI password
//       true
//     );

//     this.ami.keepConnected();
//   }

//   async getStatus(): Promise<any> {
//     const coreShowChannels = await this.sendCommand('core show channels');
//     const sipShowPeers = await this.sendCommand('sip show peers');
//     const pjsipShowEndpoints = await this.sendCommand('pjsip show endpoints');
//     const uptime = await this.sendCommand('core show uptime');

//     return {
//       coreShowChannels,
//       sipShowPeers,
//       pjsipShowEndpoints,
//       uptime,
//     };
//   }

//   private sendCommand(cmd: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//       this.ami.action(
//         {
//           Action: 'Command',
//           Command: cmd,
//         },
//         (err, res) => {
//           if (err) reject(err);
//           else resolve(res?.Response?.output?.join('\n') || res?.Output || '');
//         },
//       );
//     });
//   }
// }

