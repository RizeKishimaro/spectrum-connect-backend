// src/appointment/dto/create-appointment.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'UUID of CRM', description: 'CRM ID' })
  @IsUUID()
  crmId: string;

  @ApiProperty({
    example: '2025-07-20T14:30:00Z',
    description: 'Scheduled date and time',
  })
  @IsDateString()
  scheduledFor: Date;

  @ApiProperty({ enum: AppointmentStatus, default: AppointmentStatus.pending })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiProperty({ example: 'Rescheduled due to conflict', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}
