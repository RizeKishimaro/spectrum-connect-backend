// src/customer-crm/dto/appointment.dto.ts
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsDateString() scheduledFor!: string; // ISO string
  @IsString() cRMAppointmentStatusId!: string; // status id
  @IsString() companyMembersId!: string
  @IsOptional() @IsString() cRMLeadsId?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsString() cRMAppointmentStatusId?: string;
  @IsOptional() @IsString() cRMLeadsId?: string;
  @IsOptional() @IsString() note?: string;
}

