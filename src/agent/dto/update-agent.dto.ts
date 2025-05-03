import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateAgentDto } from './create-agent.dto';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AgentStatus, SIPTech } from '@prisma/client';


export class UpdateAgentDto {
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

  @ApiProperty({ enum: SIPTech, default: SIPTech.PJSIP })
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

