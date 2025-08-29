import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyMemberDto, UpdateCompanyMemberDto } from 'src/customer-crm/dto/company-members.dto';
import type { Prisma as P } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/utils/prisma/prisma.service';


@Injectable()
export class CompanyMembersService {
  constructor(private readonly prisma: PrismaService) { }


  async list(systemCompanyId: number, search?: string, orderBy?: string) {
    const where: P.CompanyMembersWhereInput = { systemCompanyId };
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }


    const [field, dir] = (orderBy ?? 'name:asc').split(':');
    const order: P.CompanyMembersOrderByWithRelationInput = {};
    if (field === 'name') order.name = dir === 'desc' ? 'desc' : 'asc';
    else order.name = 'asc';


    const data = await this.prisma.companyMembers.findMany({
      where,
      orderBy: [order],
      select: { id: true, name: true },
    });


    return { data };
  }


  async create(systemCompanyId: number, dto: CreateCompanyMemberDto) {
    const item = await this.prisma.companyMembers.create({
      data: { name: dto.name.trim(), systemCompanyId },
      select: { id: true, name: true },
    });
    return { data: item };
  }


  async update(systemCompanyId: number, id: string, dto: UpdateCompanyMemberDto) {
    const exists = await this.prisma.companyMembers.findFirst({
      where: { id, systemCompanyId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Member not found');


    const item = await this.prisma.companyMembers.update({
      where: { id },
      data: { name: dto.name?.trim() },
      select: { id: true, name: true },
    });
    return { data: item };
  }


  async remove(systemCompanyId: number, id: string) {
    const exists = await this.prisma.companyMembers.findFirst({
      where: { id, systemCompanyId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Member not found');


    try {
      await this.prisma.companyMembers.delete({ where: { id } });
      return { success: true };
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2003') {
        // Foreign key violation (e.g., referenced by CRMAppointment)
        throw new BadRequestException('Cannot delete: member is referenced by appointments.');
      }
      throw e;
    }
  }
}
