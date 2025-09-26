import { Module, DynamicModule, Global } from '@nestjs/common';
import { DialerController } from './dialer.controller';
import { AgentService } from 'src/agent/agent.service';
import { CustomerCrmService } from 'src/customer-crm/customer-crm.service';
import { LockService } from './locks/lock.service';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { DialerGateway } from './dialer.gateway';
import { JwtService } from '@nestjs/jwt';
import { SystemCompanyService } from 'src/system-company/system-company.service';
import { SystemManagerService } from 'src/system-manager/system-manager.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';
import { DialerService } from './dialer.service';
import { ARI_CLIENT } from 'src/utils/ari/ari.module';
import * as Ari from 'ari-client';
import { WsGatewayGateway } from 'src/ws-gateway/ws-gateway.gateway';
import { ConfigService } from '@nestjs/config';


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
      controllers: [DialerController],
      providers: [
        {
          provide: ARI_CLIENT,
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            const host = config.get<string>("ARI_URL");
            const user = config.get<string>("ARI_USERNAME");
            const password = config.get<string>("ARI_PASSWORD")
            const ari = await Ari.connect(host as string, user as string, password as string, (error, client) => {

              client.start(process.env.ARI_APP as string)
            });
            return ari;
          },
        },

        DialerService,
        AgentService,
        CustomerCrmService,
        LockService,
        PrismaService,
        SystemManagerService,
        ParkedCallService,
        JwtService,
        WsGatewayGateway,
        ConfigService
      ],
      exports: [DialerService],
    };
  }
}

