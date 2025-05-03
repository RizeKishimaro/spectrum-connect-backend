// src/call-log/dto/create-call-log.dto.ts
import { IsEnum, IsOptional, IsString, IsInt } from 'class-validator'
import { CallDirection, CallStatus } from '@prisma/client'

export class CreateCallLogDto {
  @IsString()
  callerId: string

  @IsOptional()
  @IsString()
  calleeId?: string

  @IsEnum(CallDirection)
  direction: CallDirection

  @IsEnum(CallStatus)
  status: CallStatus

  @IsOptional()
  @IsString()
  action?: string

  @IsOptional()
  @IsString()
  agentId?: string

  @IsString()
  systemName: string

  @IsOptional()
  @IsString()
  hungUpBy?: string

  @IsOptional()
  @IsInt()
  duration?: number
}

