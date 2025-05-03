import { Module } from '@nestjs/common';
import { CallLogService } from './call-log.service';
import { CallLogController } from './call-log.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  controllers: [CallLogController],
  providers: [CallLogService, PrismaService],
})
export class CallLogModule { }
