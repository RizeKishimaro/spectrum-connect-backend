// src/customer-crm/customer-crm.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { CustomerCrmService } from './customer-crm.service';
import { CreateLeadDto, CreateLeadsDto, UpdateLeadDto } from './dto/lead.dto';
import { QueryDto } from './dto/query.dto';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { CreateStatusDto, UpdateStatusDto } from './dto/status.dto';
import { ExpressRequest } from 'src/types/other';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('customer-crm')
export class CustomerCrmController {
  constructor(
    private readonly service: CustomerCrmService,
    private readonly prisma: PrismaService

  ) { }
  @Get("services")
  list(@Req() req: any, @Query() q: QueryDto) {
    const systemCompanyId: number = Number(req.user?.user?.systemCompanyId);
    return this.service.list(systemCompanyId, q);
  }


  @Get('services/:id')
  get(@Req() req: any, @Param('id') id: string) {
    const systemCompanyId: number = Number(req.user?.user?.systemCompanyId);
    return this.service.getById(systemCompanyId, id);
  }


  @Post("services")
  create(@Req() req: any, @Body() dto: CreateServiceDto) {
    const systemCompanyId: number = Number(req.user?.user?.systemCompanyId);
    return this.service.create(systemCompanyId, dto);
  }


  @Patch('services/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    const systemCompanyId: number = Number(req.user?.user?.systemCompanyId);
    return this.service.update(systemCompanyId, id, dto);
  }


  @Delete('services/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    const systemCompanyId: number = Number(req.user?.user?.systemCompanyId);
    return this.service.remove(systemCompanyId, id);
  }

  @Post('leads')
  createLead(@Body() dto: CreateLeadDto, @Req() req: ExpressRequest) {
    return this.service.createLead(dto, req);
  }
  @Post('leads/bulk')
  createBulkLeads(@Body() dto: CreateLeadsDto, @Req() req: ExpressRequest) {
    return this.service.createBulkLeads(dto, req);
  }

  @Get('leads')
  listLeads(@Query() q: QueryDto, @Req() req: ExpressRequest) {
    return this.service.listLeads(q, req);
  }

  @Get('leads/:id')
  getLead(@Param('id') id: string) {
    return this.service.getLead(id);
  }

  @Patch('leads/:id')
  updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.updateLead(id, dto);
  }

  @Delete('leads/:id')
  deleteLead(@Param('id') id: string) {
    return this.service.deleteLead(id);
  }

  // ----- Appointment Status -----
  @Post('statuses')
  createStatus(@Body() dto: CreateStatusDto, @Req() req: ExpressRequest) {
    return this.service.createStatus(dto, req);
  }

  @Get('statuses')
  async listStatuses() {
    const statuses = await this.service.listStatuses();
    console.log(statuses)
    return statuses;
  }

  @Patch('statuses/:id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Delete('statuses/:id')
  deleteStatus(@Param('id') id: string) {
    return this.service.deleteStatus(id);
  }

  // -------- Appointments --------
  @Post('appointments')
  createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.service.createAppointment(dto);
  }

  @Get('appointments')
  listAppointments(@Query() q: QueryDto & { leadId?: string }) {
    return this.service.listAppointments(q);
  }

  @Patch('appointments/:id')
  updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.service.updateAppointment(id, dto);
  }

  @Delete('appointments/:id')
  deleteAppointment(@Param('id') id: string) {
    return this.service.deleteAppointment(id);
  }
}

