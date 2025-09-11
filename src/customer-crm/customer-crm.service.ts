// src/customer-crm/customer-crm.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { QueryDto } from './dto/query.dto';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { ExpressRequest } from 'src/types/other';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { parseOrderBy } from 'src/utils/order-by';





@Injectable()
export class CustomerCrmService {
  constructor(private readonly prisma: PrismaService) { }
  async list(systemCompanyId: number, params: { page?: number; pageSize?: number; search?: string; orderBy?: string }) {
    const { page = 0, pageSize = 20, search, orderBy } = params;
    const where = {
      systemCompanyId,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };


    const [data, total] = await this.prisma.$transaction([
      this.prisma.services.findMany({
        where,
        orderBy: parseOrderBy(orderBy) ?? { createdAt: 'desc' },
        skip: page * pageSize,
        take: +pageSize,
      }),
      this.prisma.services.count({ where }),
    ]);


    return { data, total, page, pageSize };
  }


  async getById(systemCompanyId: number, id: string) {
    const item = await this.prisma.services.findFirst({ where: { id, systemCompanyId } });
    if (!item) throw new NotFoundException('Service not found');
    return item;
  }


  async create(systemCompanyId: number, dto: CreateServiceDto) {
    return this.prisma.services.create({ data: { name: dto.name, systemCompanyId } });
  }


  async update(systemCompanyId: number, id: string, dto: UpdateServiceDto) {
    // ensure tenant ownership
    await this.getById(systemCompanyId, id);
    return this.prisma.services.update({ where: { id }, data: { ...dto } });
  }


  async remove(systemCompanyId: number, id: string) {
    await this.getById(systemCompanyId, id);
    return this.prisma.services.delete({ where: { id } });
  }
  async nextLead(systemCompanyId: number) {
    const lead = await this.prisma.cRMLeads.findFirst({
      where: { systemCompanyId, isContacted: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!lead) return null;
    // soft lock lead in DB so other workers won't grab it (best with a field)
    await this.prisma.cRMLeads.update({ where: { id: lead.id }, data: { isContacted: true } });
    return lead;
  }

  // --------- Leads ----------


  async createLead(dto: CreateLeadDto, req: ExpressRequest) {
    const systemCompanyId = req.user.user.systemCompanyId;

    return this.prisma.cRMLeads.create({
      data: {
        // everything except serviceIds goes straight in
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        employeeCount: dto.employeeCount,
        companyCount: dto.companyCount,
        isContacted: dto.isContacted,
        contactStatus: dto.contactStatus,
        description: dto.description,
        address: dto.address,
        systemCompanyId,

        // ✅ map IDs to where-unique inputs
        services: {
          connect: (dto.serviceIds ?? [])
            .filter(Boolean)
            .map((id) => ({ id })), // <- ServicesWhereUniqueInput[]
        },
      },
    });
  }


  async listLeads(q: QueryDto) {
    const where: Prisma.CRMLeadsWhereInput = q.search
      ? {
        OR: [
          { email: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search, mode: 'insensitive' } },
          { companyName: { contains: q.search, mode: 'insensitive' } },
          { address: { contains: q.search, mode: 'insensitive' } },
        ],
      }
      : {};

    const skip = (q.page ?? 0) * (q.pageSize ?? 20);
    const take = q.pageSize ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cRMLeads.findMany({
        where,
        skip,
        take: +take,
        orderBy: parseOrderBy(q.orderBy) ?? [{ createdAt: 'desc' }],
        include: { Appointment: true, systemCompany: true },
      }),
      this.prisma.cRMLeads.count({ where }),
    ]);

    return { items, total, page: q.page ?? 0, pageSize: take };
  }

  async getLead(id: string) {
    const item = await this.prisma.cRMLeads.findUnique({
      where: { id },
      include: { Appointment: { include: { status: true } }, systemCompany: true },
    });
    if (!item) throw new NotFoundException('Lead not found');
    return item;
  }

  async updateLead(id: string, dto: UpdateLeadDto) {
    await this.getLead(id);
    return this.prisma.cRMLeads.update({ where: { id }, data: dto });
  }

  async deleteLead(id: string) {
    await this.getLead(id);
    return this.prisma.cRMLeads.delete({ where: { id } });
  }

  async createStatus(dto: CreateStatusDto, req: ExpressRequest) {
    if (dto.isDefault) {
      // ensure only one default
      await this.prisma.cRMAppointmentStatus.updateMany({
        data: { isDefault: false },
        where: { isDefault: true },
      });
    }
    return this.prisma.cRMAppointmentStatus.create({ data: { ...dto, systemCompanyId: req.user.user.systemCompanyId } });
  }

  async listStatuses() {
    const data = await this.prisma.cRMAppointmentStatus.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return {
      data
    };
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    // keep single default invariant
    if (dto.isDefault) {
      await this.prisma.cRMAppointmentStatus.updateMany({
        data: { isDefault: false },
        where: { isDefault: true, NOT: { id } },
      });
    }
    return this.prisma.cRMAppointmentStatus.update({
      where: { id },
      data: dto,
    });
  }

  async deleteStatus(id: string) {
    // reassign appointments to some default if needed
    const defaultStatus = await this.prisma.cRMAppointmentStatus.findFirst({ where: { isDefault: true, NOT: { id } } });
    if (!defaultStatus) {
      // prevent delete to avoid orphaning appointments without a status
      const count = await this.prisma.cRMAppointment.count({ where: { cRMAppointmentStatusId: id } });
      if (count > 0) {
        throw new Error('Cannot delete the last status with existing appointments. Create another default first.');
      }
    } else {
      await this.prisma.cRMAppointment.updateMany({
        where: { cRMAppointmentStatusId: id },
        data: { cRMAppointmentStatusId: defaultStatus.id },
      });
    }
    return this.prisma.cRMAppointmentStatus.delete({ where: { id } });
  }

  // --------- Appointments ----------
  async createAppointment(dto: CreateAppointmentDto) {
    return this.prisma.cRMAppointment.create({
      data: {
        companyMembersId: dto.companyMembersId,
        scheduledFor: new Date(dto.scheduledFor),
        cRMAppointmentStatusId: dto.cRMAppointmentStatusId,
        cRMLeadsId: dto.cRMLeadsId ?? null,
        note: dto.note,
      },
      include: { status: true, CRMLeads: true },
    });
  }

  async listAppointments(q: QueryDto & { leadId?: string }) {
    const where: Prisma.CRMAppointmentWhereInput = {
      ...(q.search
        ? {
          OR: [{ note: { contains: q.search, mode: 'insensitive' } }],
        }
        : {}),
      ...(q['leadId'] ? { cRMLeadsId: q['leadId'] } : {}),
    };

    const skip = (q.page ?? 0) * (q.pageSize ?? 20);
    const take = q.pageSize ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cRMAppointment.findMany({
        where,
        skip,
        take: +take,
        orderBy: [{ scheduledFor: 'desc' }],
        include: { status: true, CRMLeads: true, companyMembers: true },
      }),
      this.prisma.cRMAppointment.count({ where }),
    ]);

    return { items, total, page: q.page ?? 0, pageSize: take };
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    return this.prisma.cRMAppointment.update({
      where: { id },
      data: {
        ...(dto.scheduledFor ? { scheduledFor: new Date(dto.scheduledFor) } : {}),
        ...(dto.cRMAppointmentStatusId ? { cRMAppointmentStatusId: dto.cRMAppointmentStatusId } : {}),
        ...(dto.cRMLeadsId !== undefined ? { cRMLeadsId: dto.cRMLeadsId } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
      include: { status: true, CRMLeads: true },
    });
  }

  async deleteAppointment(id: string) {
    return this.prisma.cRMAppointment.delete({ where: { id } });
  }
}

