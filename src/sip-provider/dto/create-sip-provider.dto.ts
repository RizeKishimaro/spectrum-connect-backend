
import { IsString, IsInt, IsEnum, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';
import { SIPTech } from '@prisma/client';
import { Type } from 'class-transformer';

class PJSIPSectionConfig {
  @IsString()
  name: string;

  @IsNotEmpty()
  config: Record<string, any>;
}

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
  sipTech: SIPTech;

  @IsString()
  @IsOptional()
  AccessToken: string;

  @IsString()
  @IsNotEmpty()
  DIDNumber: string;

  @IsInt()
  CallLimit: number;

  @IsString()
  EndpointName: string;

  // 🌟 Add these cuties:
  @ValidateNested()
  @Type(() => PJSIPSectionConfig)
  endpoint: PJSIPSectionConfig;

  @ValidateNested()
  @Type(() => PJSIPSectionConfig)
  auth: PJSIPSectionConfig;

  @ValidateNested()
  @Type(() => PJSIPSectionConfig)
  aor: PJSIPSectionConfig;

  @ValidateNested()
  @Type(() => PJSIPSectionConfig)
  identify: PJSIPSectionConfig;

  @ValidateNested()
  @Type(() => PJSIPSectionConfig)
  contact: PJSIPSectionConfig;
}


