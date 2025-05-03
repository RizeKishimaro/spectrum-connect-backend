import { Module } from '@nestjs/common';
import { RtpAddressService } from './rtp-address.service';
import { RtpAddressController } from './rtp-address.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  controllers: [RtpAddressController],
  providers: [RtpAddressService, PrismaService],
})
export class RtpAddressModule { }
