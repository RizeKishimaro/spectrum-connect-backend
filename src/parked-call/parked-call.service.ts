
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/utils/prisma/prisma.service'; // adjust if needed
import { Prisma, ParkedCall } from '@prisma/client';

@Injectable()
export class ParkedCallService {
  constructor(private readonly prisma: PrismaService) { }

  async createParkedCall(data: Prisma.ParkedCallCreateInput) {
    return this.prisma.parkedCall.create({ data });
  }

  async unparkCall(id: string) {
    return this.prisma.parkedCall.update({
      where: { id },
      data: {
        isActive: false,
        unparkedAt: new Date(),
      },
    });
  }

  async getActiveParkedCalls(): Promise<ParkedCall[] | []> {
    return this.prisma.parkedCall.findMany({
      where: { isActive: true },
    });
  }

  async findByChannel(channel: string) {
    return this.prisma.parkedCall.findFirst({
      where: { sipChannel: channel, isActive: true },
    });
  }
}


