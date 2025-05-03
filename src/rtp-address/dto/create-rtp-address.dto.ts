import { IsString } from 'class-validator';

export class CreateRtpAddressDto {
  @IsString()
  RTPAddress: string;

  @IsString()
  Name: string;

  @IsString()
  Remark: string;

  @IsString()
  sIPProviderId: string;
}

