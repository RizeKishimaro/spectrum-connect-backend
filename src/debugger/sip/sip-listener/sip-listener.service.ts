import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as dgram from 'dgram';
import * as hepjs from 'hep-js';
import { SipSessionService } from '../sip-session/sip-session.service';
import { SipGateway } from './sip.gateway';
import { TelegramService } from 'src/utils/telegram/telegram.service';
import { PrismaService } from 'src/utils/prisma/prisma.service';

const HEP_PORT = 9060;

@Injectable()
export class SipListenerService implements OnModuleInit, OnModuleDestroy {
  private server = dgram.createSocket('udp4');
  private readonly logger = new Logger(SipListenerService.name);

  constructor(
    private readonly sessionService: SipSessionService,
    private readonly sipGateway: SipGateway,
    private readonly telegram: TelegramService,
    private readonly prisma: PrismaService,
  ) { }

  onModuleInit() {
    this.server.on('message', async (msg) => {
      try {
        if (msg.length < 4 || msg[0] !== 0x48 || msg[1] !== 0x45 || msg[2] !== 0x50) {
          return;
        }


        const hep = hepjs.decapsulate(msg);
        if (!hep?.rcinfo) return;

        const rc = hep.rcinfo;
        const payloadType = rc.payloadType;

        if (payloadType !== 1) return;

        const payload = (hep.payload as Buffer).toString().replace(/\0/g, '');
        const firstLine = payload.split('\n')[0]?.trim();
        const method = firstLine?.split(' ')[0] || 'UNKNOWN';


        const callId = rc.correlation_id || 'no-id';
        const srcIp = rc.srcIp;


        if (method === 'OPTIONS') {
          return;
        }

        // 📞 INVITE
        if (method === 'INVITE') {

          const callerMatch = payload.match(/From:.*sip:(.+?)@/);
          const caller = callerMatch?.[1] || 'Unknown';

          const calleeMatch = payload.match(/To:.*sip:(.+?)@/);
          const callee = calleeMatch?.[1] || 'Unknown';

          const callId = rc.correlation_id || 'no-id';

          // 💖 EXTRA SIP DETAILS (YOU WERE MISSING THESE)
          const callIdHeader = payload.match(/Call-ID:\s*(.+)/i);
          const sipCallId = callIdHeader?.[1]?.trim();

          const userAgentMatch = payload.match(/User-Agent:\s*(.+)/i);
          const userAgent = userAgentMatch?.[1]?.trim();

          this.logger.log(`📞 CALL: ${caller} → ${callee}`);

          // 💾 save SIP
          await this.sessionService.saveSipMessage({
            callId,
            source: srcIp,
            destination: rc.dstIp,
            method,
            body: payload,
          });

          // 💖 FIND DID → COMPANY
          const did = await this.prisma.telegramDIDNumbers.findFirst({
            where: { didNumber: callee },
          });

          if (did) {
            await this.telegram.sendCallAlert({
              callId,
              caller,
              callee,
              trunk: srcIp,
              destinationIp: rc.dstIp,
              sipMethod: method,
              sipCallId,
              userAgent,
              direction: 'inbound',
              timestamp: new Date(),
              systemCompanyId: did.systemCompanyId,
              didNumber: callee,
            });
          } else {
            this.logger.warn(`No DID match for ${callee}`);
          }

          this.sipGateway.broadcast('call-invite', {
            callId,
            caller,
            callee,
            srcIp,
          });
        }

        // 🔚 BYE
        if (method === 'BYE') {
          const callerMatch = payload.match(/From:.*sip:(.+?)@/);
          const caller = callerMatch?.[1] || 'Unknown';

          const calleeMatch = payload.match(/To:.*sip:(.+?)@/);
          const callee = calleeMatch?.[1] || 'Unknown';

          const callId = rc.correlation_id || 'no-id';

          // 💖 EXTRA SIP DETAILS (YOU WERE MISSING THESE)
          const callIdHeader = payload.match(/Call-ID:\s*(.+)/i);
          const sipCallId = callIdHeader?.[1]?.trim();

          const userAgentMatch = payload.match(/User-Agent:\s*(.+)/i);
          const userAgent = userAgentMatch?.[1]?.trim();
          const did = await this.prisma.telegramDIDNumbers.findFirst({
            where: { didNumber: callee },
          });
          if (did) {
            this.logger.log(`📞 CALL: ${caller} → ${callee}`);
            await this.telegram.sendCallAlert({
              callId,
              caller,
              callee,
              trunk: srcIp,
              destinationIp: rc.dstIp,
              sipMethod: method,
              sipCallId,
              userAgent,
              direction: 'inbound',
              timestamp: new Date(),
              systemCompanyId: did.systemCompanyId,
              didNumber: callee,
            });
          } else {
            console.log(`No DID match for ${callee}`);
          }
          this.sipGateway.broadcast('call-status', {
            callId,
            status: 'ended',
          });
        }

        // 💬 log others
        if (method !== 'INVITE' && method !== 'BYE') {
          await this.sessionService.saveSipMessage({
            callId,
            source: srcIp,
            destination: rc.dstIp,
            method,
            body: payload,
          });
        }

      } catch (err) {
        this.logger.error('HEP processing failed 💔', err);
      }
    });

    this.server.bind(HEP_PORT, '0.0.0.0', () => {
      this.logger.log(`🚀 HEP listener running on ${HEP_PORT}`);
    });
  }

  onModuleDestroy() {
    this.server.close();
  }
}
