import { Module } from '@nestjs/common';
import { ParkedCallService } from './parked-call.service';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { ParkedCallController } from './parked-call.controller';

@Module({
  controllers: [ParkedCallController],
  providers: [ParkedCallService, PrismaService],
})
export class ParkedCallModule { }

