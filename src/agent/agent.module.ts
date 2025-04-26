import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, PrismaService],
})
export class AgentModule { }
