
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentStatus, SIPTech } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class PJSIPSectionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: Object })
  @IsObject()
  config: Record<string, any>;
}

export class CreateAgentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sipUname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sipPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsEnum(SIPTech)
  @IsNotEmpty()
  SIPTech: SIPTech;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ enum: AgentStatus, default: AgentStatus.AVAILABLE })
  @IsEnum(AgentStatus)
  @IsNotEmpty()
  status: AgentStatus;

  @ApiProperty()
  @IsNotEmpty()
  systemCompanyId: number;

  // 🎀 Optional PJSIP config sections
  @ApiPropertyOptional({ type: PJSIPSectionDto })
  @ValidateNested()
  @Type(() => PJSIPSectionDto)
  @IsOptional()
  endpoint?: PJSIPSectionDto;

  @ApiPropertyOptional({ type: PJSIPSectionDto })
  @ValidateNested()
  @Type(() => PJSIPSectionDto)
  @IsOptional()
  auth?: PJSIPSectionDto;

  @ApiPropertyOptional({ type: PJSIPSectionDto })
  @ValidateNested()
  @Type(() => PJSIPSectionDto)
  @IsOptional()
  aor?: PJSIPSectionDto;
}

