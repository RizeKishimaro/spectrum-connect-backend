import { Injectable } from '@nestjs/common';
import { CreateRtpAddressDto, UpdateRtpAddressDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class RtpAddressService {
  constructor(private prisma: PrismaService) { }

  create(data: CreateRtpAddressDto) {
    return this.prisma.rTPAddress.create({ data });
  }

  findAll() {
    return this.prisma.rTPAddress.findMany({
      include: { SIPProvider: true },
    });
  }

  findOne(id: string) {
    return this.prisma.rTPAddress.findUnique({
      where: { id },
      include: { SIPProvider: true },
    });
  }

  update(id: string, data: UpdateRtpAddressDto) {
    return this.prisma.rTPAddress.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.rTPAddress.delete({
      where: { id },
    });
  }
}

