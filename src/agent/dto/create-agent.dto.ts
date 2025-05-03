import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus, SIPTech } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

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
  SIPTech: SIPTech

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
}

