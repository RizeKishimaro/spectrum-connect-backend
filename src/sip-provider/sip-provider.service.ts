import { Injectable } from '@nestjs/common';
import { CreateSIPProviderDto, UpdateSIPProviderDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class SipProviderService {
  constructor(private prisma: PrismaService) { }

  create(data: CreateSIPProviderDto) {
    return this.prisma.sIPProvider.create({ data });
  }

  findAll() {
    return this.prisma.sIPProvider.findMany();
  }

  findOne(id: string) {
    return this.prisma.sIPProvider.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateSIPProviderDto) {
    return this.prisma.sIPProvider.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.sIPProvider.delete({ where: { id } });
  }
}

