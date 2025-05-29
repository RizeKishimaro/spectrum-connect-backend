import { IsBoolean, IsDateString, IsInt, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  active?: boolean = true;

  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsInt()
  agentCount: number;

  @ApiProperty()
  @IsDateString()
  expiresAt: string;
}

