import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentStatus } from '@prisma/client';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateAgentDto, UpdateAgentDto } from './dto';
import { deleteAgentFromPJSIP, writeAgentToPJSIP } from 'src/utils/pjsip-writer';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) { }


  async create(data: CreateAgentDto) {
    const password = await bcrypt.hash(data.sipPassword, 10)
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
    return this.prisma.agent.findMany({
      include: {
        systemCompany: {
          select: {
            name: true
          }
        }
      }
    });
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
  async remove(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      throw new Error(`Agent with id ${id} not found! (＞﹏＜)`);
    }

    await this.prisma.agent.delete({ where: { id } });

    await deleteAgentFromPJSIP(agent.sipUname);
    await deleteAgentFromPJSIP()
    return { message: 'Agent removed successfully~! 💖' };
  }
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



  async getAgentOverview(agentId: string) {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const agentData = await this.prisma.agent.findFirst({ where: { id: agentId } });

    const [
      callVolumeToday,
      avgDurationToday,
      callLogsLastWeek,
      scheduleToday,
      answeredCallsToday,
      resolvedCallsToday,
      avgWaitTimeToday
    ] = await Promise.all([
      this.prisma.callLog.count({
        where: {
          agent: { systemCompanyId: agentData?.systemCompanyId },
          createdAt: { gte: todayStart },
        },
      }),

      this.prisma.callLog.aggregate({
        _avg: { duration: true },
        where: {
          agent: { systemCompanyId: agentData?.systemCompanyId },
          createdAt: { gte: todayStart },
        },
      }),

      this.prisma.callLog.findMany({
        where: {
          agent: { systemCompanyId: agentData?.systemCompanyId },
          createdAt: { gte: weekAgo },
        },
        distinct: ['callerId'],
        select: { callerId: true },
      }),

      Promise.resolve([
        {
          label: 'Morning Shift',
          time: '8:00 AM - 12:00 PM',
          status: 'Active',
        },
        {
          label: 'Lunch Break',
          time: '12:00 PM - 1:00 PM',
          status: 'Upcoming',
        },
        {
          label: 'Afternoon Shift',
          time: '1:00 PM - 5:00 PM',
          status: 'Upcoming',
        },
      ]),

      this.prisma.callLog.aggregate({
        _count: true,
        where: {
          agentId,
          status: 'CONNECTED',
          createdAt: { gte: todayStart },
        },
      }),

      this.prisma.callLog.aggregate({
        _count: true,
        where: {
          agentId,
          action: 'RESOLVED',
          createdAt: { gte: todayStart },
        },
      }),

      Promise.resolve({ _avg: { waitTime: 45 } }),
    ]);

    return {
      callVolume: callVolumeToday,
      avgCallDuration: this.formatDuration(avgDurationToday._avg.duration || 0),
      customerSatisfaction: 94, // Placeholder for satisfaction — you can add your own feedback model later!
      customersHelped: callLogsLastWeek.length,
      schedule: scheduleToday,
      teamPerformance: {
        callAnswerRate: this.calcPercentage(answeredCallsToday._count, callVolumeToday),
        firstCallResolution: this.calcPercentage(resolvedCallsToday._count, callVolumeToday),
        averageWaitTime: this.formatDuration(avgWaitTimeToday._avg.waitTime || 45),
      },
    };
  }

  private calcPercentage(part: number, total: number): number {
    return total === 0 ? 0 : Math.round((part / total) * 100);
  }

  private formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  }

}
