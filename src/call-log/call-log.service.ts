// src/call-log/call-log.service.ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateCallLogDto, UpdateCallLogDto } from './dto'
import { PrismaService } from 'src/utils/prisma/prisma.service'
import { AgentStatus, CallStatus } from '@prisma/client';
import { PaginationService } from 'src/utils/providers/pagination/pagination.service';

@Injectable()
export class CallLogService {
  constructor(
    private prisma: PrismaService,
    private paginationService: PaginationService,
  ) { }


  async create(data: CreateCallLogDto) {
    const systemCompany = await this.prisma.systemCompany.findFirst({
      where: {
        id: data.systemId
      },
      select: {
        name: true
      }
    });

    if (!systemCompany) throw new BadRequestException("Invalid Company ID");

    await this.prisma.agent.update({
      where: {
        id: data.agentId
      },
      data: {
        status: AgentStatus.AVAILABLE
      }
    });

    // 🌸 Replace spaces in status with underscores
    const safeStatus = data.status.replace(/\s+/g, "_") as CallStatus;

    return await this.prisma.callLog.create({
      data: {
        hungUpBy: data.hungUpBy || null,
        status: safeStatus,
        direction: data.direction,
        duration: data.duration,
        agentId: data.agentId,
        action: data.action || null,
        callerId: data.callerId,
        calleeId: data.calleeId || null,
        systemName: systemCompany?.name
      }
    });
  }
  async findAll(user: any, page: number = 1, limit: number = 10) {
    if (!user.user.roles) return await this.findAgentCallLogs(user, page, limit)
    const where = user.user.roles === 'company_user'
      ? {
        agent: {
          systemCompanyId: user.user.systemCompanyId
        }
      }
      : {};

    const call_logs = await this.paginationService.paginate(this.prisma.callLog, {
      page,
      limit,
      where,
      include: { agent: true },
      orderBy: { createdAt: 'desc' }, // optional~
    });
    return call_logs;
  }

  async findAgentCallLogs(user: any, page: number = 1, limit: number = 10) {
    const where =
    {
      agent: {
        systemCompanyId: user.user.systemCompanyId,
        id: user.user.id
      }
    }


    const call_logs = await this.paginationService.paginate(this.prisma.callLog, {
      page,
      limit,
      where,
      include: { agent: true },
      orderBy: { createdAt: 'desc' }, // optional~
    });
    return call_logs;
  }

  findOne(id: string) {
    return this.prisma.callLog.findUnique({ where: { id }, include: { agent: true } })
  }

  update(id: string, data: UpdateCallLogDto) {
    return this.prisma.callLog.update({ where: { id }, data })
  }

  remove(id: string) {
    return this.prisma.callLog.delete({ where: { id } })
  }
}

