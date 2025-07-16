// src/appointment/appointment.service.ts

import { Injectable } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { PaginationService } from 'src/utils/providers/pagination/pagination.service';

@Injectable()
export class AppointmentService {
  constructor(
    private prisma: PrismaService,
    private paginationService: PaginationService,
  ) {}

  async create(data: CreateAppointmentDto) {
    return this.prisma.appointment.create({ data });
  }

  async findAll(page = 1, limit = 10) {
    const where = {};
    const appointments = await this.paginationService.paginate(
      this.prisma.appointment,
      {
        page,
        limit,
        where,
        include: { crm: true },
        orderBy: { createdAt: 'desc' },
      },
    );
    return appointments;
  }

  async findOne(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: { crm: true },
    });
  }

  async update(id: string, data: Partial<CreateAppointmentDto>) {
    return this.prisma.appointment.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.appointment.delete({ where: { id } });
  }
}
