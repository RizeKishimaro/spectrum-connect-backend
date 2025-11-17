import { Module } from '@nestjs/common';
import { SipLogService } from './sip-log/sip-log.service';
import { SipLogController } from './sip-log/sip-log.controller';
import { SipListenerService } from './sip-listener/sip-listener.service';
import { SipSessionService } from './sip-session/sip-session.service';
import { SipSessionController } from './sip-session/sip-session.controller';
import { SipGateway } from './sip-listener/sip.gateway';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  providers: [SipListenerService, SipLogService, PrismaService, SipSessionService, SipGateway],
  controllers: [SipLogController, SipSessionController]
})
export class SipModule { }
