import { IsString, IsInt } from 'class-validator';

export class CreateSystemCompanyDto {
  @IsString()
  name: string;

  @IsString()
  membersCount: string;

  @IsString()
  address: string;

  @IsString()
  country: string;

  @IsString()
  state: string;

  @IsString()
  SIPProviderId: string;
}

