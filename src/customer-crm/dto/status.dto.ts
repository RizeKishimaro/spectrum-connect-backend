// src/customer-crm/dto/status.dto.ts
import { IsBoolean, IsString } from 'class-validator';

export class CreateStatusDto {
  @IsString() name!: string;
  @IsBoolean() isDefault!: boolean;
}

export class UpdateStatusDto {
  @IsString() name!: string;
  @IsBoolean() isDefault!: boolean;
}

