import { Injectable } from '@nestjs/common';
import { CreateSystemCompanyDto, UpdateSystemCompanyDto } from './dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class SystemCompanyService {
  constructor(private prisma: PrismaService) { }

  create(data: CreateSystemCompanyDto) {
    return this.prisma.systemCompany.create({
      data: {
        name: data.name,
        country: data.country,
        state: data.state,
        membersCount: data.membersCount,
        address: data.address,
        SIPProvider: {
          connect: {
            id: data.SIPProviderId
          }
        }
      }
    });
  }


  findAll(user: User) {
    const where: Prisma.SystemCompanyWhereInput =
      user.roles === Role.company_user
        ? { User: { some: { id: user.id } } }
        : {};

    return this.prisma.systemCompany.findMany({
      where,
      include: {
        SIPProvider: true,
        Agent: {
          select: {
            _count: true,
          },
        },
      },
    });
  }

  findOne(id: number) {
    return this.prisma.systemCompany.findUnique({
      where: { id },
      include: { SIPProvider: true },
    });
  }

  update(id: number, data: UpdateSystemCompanyDto) {
    return this.prisma.systemCompany.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.systemCompany.delete({ where: { id } });
  }
}

