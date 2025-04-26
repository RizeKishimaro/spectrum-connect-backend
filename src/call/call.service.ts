
import { Injectable } from '@nestjs/common';
import { CallStatus } from '@prisma/client';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class CallService {
  constructor(private prisma: PrismaService) { }


  async logCall(callerId: string, type: string) {
    return this.prisma.callSession.create({
      data: {
        callerId,
        status: 'WAITING',
        type,
      },
    });
  }

  async updateCallStatus(id: string, status: CallStatus) {
    return this.prisma.callSession.update({
      where: { id },
      data: { status },
    });
  }
}

