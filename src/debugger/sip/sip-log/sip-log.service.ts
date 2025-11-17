
// src/sip/sip-log.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class SipLogService {
  constructor(private prisma: PrismaService) { }


  async createLog(sessionId: number, data: {
    source: string;
    destination: string;
    method: string;
    body: string;
  }) {
    return this.prisma.sipMessage.create({
      data: {
        sessionId,
        source: data.source,
        destination: data.destination,
        method: data.method,
        body: data.body
      }
    });
  }


  async findAll(limit = 100) {
    return this.prisma.sipMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

