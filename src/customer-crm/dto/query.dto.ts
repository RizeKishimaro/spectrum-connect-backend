// src/customer-crm/dto/query.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  page?: number = 0;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 20;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  orderBy?: string; // e.g. 'createdAt:desc'
}

