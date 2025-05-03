import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentStatus } from '@prisma/client';
import { Agent as PrismaAgent } from 'http';
import { LoginDto } from 'src/auth/dto/login.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateAgentDto, UpdateAgentDto } from './dto';
import { writeAgentToPJSIP } from 'src/utils/pjsip-writer';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) { }


  async create(data: CreateAgentDto) {
    const password = await bcrypt.hash(data.password, 10)
    const agent = await this.prisma.agent.create({
      data: {
        ...data,
        password: password
      }
    });

    if (data.SIPTech === 'PJSIP') {
      await writeAgentToPJSIP({
        sipUname: data.sipUname,
        sipPassword: data.sipPassword,
      });
    }

    return agent;
  }

  findAll() {
    return this.prisma.agent.findMany();
  }

  findOne(id: string) {
    return this.prisma.agent.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateAgentDto) {
    const agent = await this.prisma.agent.update({
      where: { id },
      data,
    });

    if (data.SIPTech === 'PJSIP') {
      await writeAgentToPJSIP({
        sipUname: data.sipUname,
        sipPassword: data.sipPassword,
      });
    }

    return agent;
  }
  remove(id: string) {
    return this.prisma.agent.delete({ where: { id } });
  }

  async getAvailableAgent(): Promise<any> {
    return this.prisma.agent.findFirst({
      where: { status: 'AVAILABLE' },
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
