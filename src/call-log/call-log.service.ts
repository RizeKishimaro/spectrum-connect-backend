// src/call-log/call-log.service.ts
import { Injectable } from '@nestjs/common'
import { CreateCallLogDto, UpdateCallLogDto } from './dto'
import { PrismaService } from 'src/utils/prisma/prisma.service'

@Injectable()
export class CallLogService {
  constructor(private prisma: PrismaService) { }

  create(data: CreateCallLogDto) {
    return this.prisma.callLog.create({ data })
  }

  findAll() {
    return this.prisma.callLog.findMany({ include: { agent: true } })
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

