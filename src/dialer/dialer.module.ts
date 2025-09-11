import { Module, DynamicModule, Global } from '@nestjs/common';
import { DialerService } from './dialer.service';
import { DialerController } from './dialer.controller';
import { AriClient } from 'src/utils/ari/ari-utils';
import { AgentService } from 'src/agent/agent.service';
import { CustomerCrmService } from 'src/customer-crm/customer-crm.service';
import { LockService } from './locks/lock.service';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { DialerGateway } from './dialer.gateway';
import { JwtService } from '@nestjs/jwt';
import { SystemCompanyService } from 'src/system-company/system-company.service';
import { SystemManagerService } from 'src/system-manager/system-manager.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';


export interface DialerModuleOptions {
  callerIdName?: string;
  ringTimeoutSec?: number; // how long to ring agent before drop
  maxQueuePerAgent?: number; // default concurrency per agent
  holdMohClass?: string; // music on hold for customers while waiting
  useRedisLock?: boolean;
}



@Global()
@Module({})
export class DialerModule {
  static forRoot(opts: DialerModuleOptions = {}): DynamicModule {
    const options = {
      callerIdName: opts.callerIdName ?? 'AutoDialer',
      ringTimeoutSec: opts.ringTimeoutSec ?? 20,
      maxQueuePerAgent: opts.maxQueuePerAgent ?? 8,
      holdMohClass: opts.holdMohClass ?? 'default',
      useRedisLock: !!opts.useRedisLock,
    };

    return {
      module: DialerModule,
      controllers: [DialerController], // 💡 make sure controller is here
      providers: [
        { provide: 'DIALER_OPTS', useValue: options },
        DialerService,
        AriClient,
        AgentService,
        CustomerCrmService,
        LockService,
        PrismaService,
        DialerGateway,
        SystemManagerService,
        ParkedCallService,
        JwtService
      ],
      exports: [DialerService],
    };
  }
}

