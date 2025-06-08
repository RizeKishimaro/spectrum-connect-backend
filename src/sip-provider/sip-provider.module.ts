import { Module } from '@nestjs/common';
import { SipProviderService } from './sip-provider.service';
import { SipProviderController } from './sip-provider.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  controllers: [SipProviderController],
  providers: [SipProviderService,],
})
export class SipProviderModule { }
