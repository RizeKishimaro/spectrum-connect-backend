import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { AgentStatus, Role, User } from '@prisma/client';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateAgentDto, UpdateAgentDto, UpdatePasswordDto } from './dto';
import { deleteAgentFromPJSIP, writeAgentToPJSIP } from 'src/utils/pjsip-writer';
import { JwtService } from '@nestjs/jwt';
import { Agent } from "@prisma/client";
import { SystemManagerService } from 'src/system-manager/system-manager.service';
import { AMIProvider } from 'src/utils/providers/ami/ami-provider.service';
import { ExpressRequest } from 'src/types/other';
import { Prisma } from '@prisma/client';
import { buildPJSIPDTOFromCreateAgentData } from 'src/utils/pjsip/pjsip-helper';

@Injectable()
export class AgentService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly amiService: AMIProvider,
    @Inject(forwardRef(() => SystemManagerService))
    private readonly systemService: SystemManagerService
  ) { }


  async markStatus(agentId: string, status: AgentStatus) {
    return this.prisma.agent.update({ where: { id: agentId }, data: { status } as any });
  }


  async findFreeAgent(systemCompanyId?: number) {
    return this.prisma.agent.findFirst({ where: { status: 'AVAILABLE', ...(systemCompanyId ? { systemCompanyId } : {}) } });
  }

  async findAllFreeAgent(systemCompanyId?: number): Promise<Agent[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        status: 'AVAILABLE',
        ...(systemCompanyId ? { systemCompanyId } : {}),
      },
    });

    return new Promise((resolve) => {
      const available: any[] = [];

      const onEvent = (event) => {
        if (event.event === 'EndpointList') {
          const agent = agents.find(a => a.sipUname === event.objectname);
          if (agent && event.devicestate === 'Not in use') {
            available.push(agent);
          }
        }

        if (event.event === 'EndpointListComplete') {
          this.amiService.removeListener('managerevent', onEvent);
          resolve(available);
        }
      };

      this.amiService.on('managerevent', onEvent);
      this.amiService.action({ Action: 'PJSIPShowEndpoints' });
    });
  }




  async getAgentEndpoint(agentId: string) {
    const ag = await this.prisma.agent.findUnique({ where: { id: agentId } });

    const sipProvider = await this.prisma.sIPProvider.findFirst({ where: { SystemCompany: { some: { id: ag?.systemCompanyId } } } });
    if (!ag) return null;
    return `PJSIP/${ag.sipUname}`;
  }


  async create(data: CreateAgentDto, userId: string) {

    const totalAgents = await this.prisma.agent.count({
      where: {
        systemCompany: {
          User: {
            some: {
              id: userId,
            },
          },
        },
      },
    });
    const maxAgents = await this.prisma.subscription.findFirst({
      where: {
        user: {
          id: userId,
        },
      },
      select: {
        agentCount: true,
      },
    })
    if (!maxAgents) {
      throw new BadRequestException('Subscription not found');
    }

    if (totalAgents >= maxAgents.agentCount) {
      throw new BadRequestException('Maximum number of agents reached');
    }

    const password = await bcrypt.hash(data.sipPassword, 10);

    const agent = await this.prisma.agent.create({
      data: {
        name: data.name,
        sipUname: data.sipUname,
        sipPassword: data.sipPassword,
        password,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        status: data.status,
        sipTech: data.SIPTech,
        systemCompanyId: data.systemCompanyId,
      },
    });



    const agentInformation = await this.prisma.agentInformation.create({
      data: {
        Agent: {
          connect: { id: agent.id },
        },
      },
    })



    // 🍥 Store PJSIP settings separately
    if (data.SIPTech === 'PJSIP') {
      await this.prisma.agentPJSIPConfig.create({
        data: {
          agentId: agent.id,
          endpoint: data.endpoint?.config ?? {},
          auth: data.auth?.config ?? {},
          aor: data.aor?.config ?? {},
        },
      });

      await writeAgentToPJSIP({
        endpoint: {
          name: data.endpoint?.name ?? data.sipUname,
          config: data.endpoint?.config ?? {},
        },
        auth: {
          name: data.auth?.name ?? `${data.sipUname}-auth`,
          config: data.auth?.config ?? {},
        },
        aor: {
          name: data.aor?.name ?? data.sipUname,
          config: data.aor?.config ?? {},
        }
      });

      await this.amiService.action({
        action: "Command",
        command: "pjsip reload"
      });
    }

    return agent;
  }
  findAll(req: User) {
    const where: Prisma.AgentWhereInput =
      req.roles === Role.company_user
        ? { systemCompany: { User: { some: { id: req.id } } } }
        : {};

    return this.prisma.agent.findMany({
      where,
      include: {
        systemCompany: {
          select: {
            name: true,
          },
        },
      },
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

    // if (agent.SIPTech === 'PJSIP') {
    //   await deleteAgentFromPJSIP(agent.sipUname);
    //   await writeAgentToPJSIP({
    //     sipUname: data.sipUname,
    //     sipPassword: data.sipPassword,
    //   });
    // }

    // const access_token = this.jwt.sign({ sub: agent.id, user: agent }, { secret: process.env.JWT_SECRET, expiresIn: "7d" });
    // return {
    //   user: agent,
    //   access_token
    // };
  }
  async remove(id: string) {
    const agent = await this.prisma.agent.findUnique({ where: { id } });

    if (!agent) {
      throw new Error(`Agent with id ${id} not found! (＞﹏＜)`);
    }
    await this.prisma.agentPJSIPConfig.delete({ where: { agentId: agent.id } });

    await this.prisma.agent.delete({ where: { id } });

    // await deleteAgentFromPJSIP(agent.sipUname);
    // await deleteAgentFromPJSIP()
    // return { message: 'Agent removed successfully~! 💖' };
  }
  // async getAvailableAgent(): Promise<Agent[] | null> {
  //   return this.prisma.agent.findMany({
  //     // where: { status: 'AVAILABLE' },
  //     orderBy: { updatedAt: 'asc' },
  //   });
  // }

  async getAvailableAgent(companyId?: number): Promise<Agent[] | []> {
    const where = companyId ? { systemCompanyId: companyId } : {};
    const agents = await this.prisma.agent.findMany({
      orderBy: { updatedAt: 'asc' },
      where
    });

    const aliveAgents: Agent[] = [];
    if (agents.length === 0) return [];

    for (const agent of agents) {
      const isAlive = await this.systemService.isPjsipUserOnline(agent.sipUname);
      if (isAlive) {
        await this.prisma.agent.update({
          where: { id: agent.id },
          data: {
            status: AgentStatus.AVAILABLE
          }
        })
        aliveAgents.push(agent);
      } else {
        await this.prisma.agent.update({
          where: { id: agent.id },
          data: {
            status: AgentStatus.OFFLINE
          }
        })
      }
    }
    console.log(aliveAgents)

    return aliveAgents.length > 0 ? aliveAgents : [];
  }

  async updateStatus(agentId: string, status: AgentStatus) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { status },
    });
  }


  async updatePassword(body: UpdatePasswordDto, agentId: string) {
    const { oldPassword, newPassword } = body;
    const agent = await this.prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new BadRequestException('Invalid credentials');
    const isMatch = await bcrypt.compare(oldPassword, agent.password);
    if (!isMatch) throw new BadRequestException('Invalid credentials');

    return this.prisma.agent.update({
      where: { id: agentId },
      data: {
        password: newPassword
      }
    })

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
