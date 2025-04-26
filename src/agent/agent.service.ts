import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentStatus } from '@prisma/client';
import { Agent as PrismaAgent } from 'http';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) { }

  async getAvailableAgent(): Promise<any> {
    return this.prisma.agent.findFirst({
      // where: { status: 'AVAILABLE' },
      orderBy: { updatedAt: 'asc' },
    });
  }
  async updateStatus(agentId: string, status: AgentStatus) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { status },
    });
  }

}
