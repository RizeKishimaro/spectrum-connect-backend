import { Module } from '@nestjs/common';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  controllers: [CallController],
  providers: [CallService],
})
export class CallModule { }
