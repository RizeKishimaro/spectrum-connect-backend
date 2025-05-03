import { IsString, IsInt, IsEnum, IsOptional } from 'class-validator';
import { SIPTech } from '@prisma/client';

export class CreateSIPProviderDto {
  @IsString()
  IpHost: string;

  @IsString()
  IpRange: string;

  @IsString()
  @IsOptional()
  SipUsername: string;

  @IsString()
  @IsOptional()
  SipPassword: string;

  @IsEnum(SIPTech)
  SipTech: SIPTech;

  @IsString()
  @IsOptional()
  AccessToken: string;

  @IsInt()
  CallLimit: number;

  @IsString()
  EndpointName: string;
}

