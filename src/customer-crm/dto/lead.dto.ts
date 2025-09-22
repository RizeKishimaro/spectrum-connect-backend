
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateLeadDto {
  @IsEmail() email!: string;
  @IsString() phone!: string;
  @IsString() companyName!: string;

  @IsOptional() @IsString() employeeCount?: string;
  @IsOptional() @IsString() companyCount?: string;

  @IsArray() @IsString({ each: true }) serviceIds!: string[];

  @IsOptional() @IsBoolean() isContacted?: boolean;
  @IsOptional() @IsString() contactStatus?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() employeeCount?: string;
  @IsOptional() @IsString() companyCount?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) serviceIds?: string[];

  @IsOptional() @IsBoolean() isContacted?: boolean;
  @IsOptional() @IsString() contactStatus?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateLeadsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLeadDto)
  leads!: CreateLeadDto[]
}
