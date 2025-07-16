// src/appointment/appointment.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BasicQuery } from 'src/utils/dto/query.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all appointments' })
  findAll(@Query() query: BasicQuery) {
    return this.appointmentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one appointment by ID' })
  findOne(@Param('id') id: string) {
    return this.appointmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateAppointmentDto>) {
    return this.appointmentService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an appointment' })
  remove(@Param('id') id: string) {
    return this.appointmentService.remove(id);
  }
}
