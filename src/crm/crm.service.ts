import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { CreateCrmDto } from './dto/create-crm.dto';
import { UpdateCrmDto } from './dto/update-crm.dto';
import { PaginationService } from 'src/utils/providers/pagination/pagination.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService, private paginationService: PaginationService) {}

  create(data: CreateCrmDto) {
    return this.prisma.crm.create({ data });
  }

async findAll(user: any, page = 1, limit = 10) {
  let where = {};

  // Optional: adapt based on roles
  if (user?.roles === 'company_user') {
    where = {
      // adapt this field based on your actual Prisma schema
      // assuming each CRM entry is linked to an agent/company
      companyName: user.systemCompanyName,
    };
  }

  const crms = await this.paginationService.paginate(this.prisma.crm, {
    page,
    limit,
    where,
    orderBy: { createdAt: 'desc' },
  });

  return crms;
}


  findOne(id: string) {
    return this.prisma.crm.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateCrmDto) {
    return this.prisma.crm.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.crm.delete({ where: { id } });
  }
}
