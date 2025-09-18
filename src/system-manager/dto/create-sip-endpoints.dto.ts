import { IsIP, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSipEndpointDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsOptional()
  @IsIP('4', { message: 'ipHost must be a valid IPv4 address' })
  ipHost?: string; // defaults server-side

  @IsString()
  @IsIn(['pjsip', 'chan_sip'])
  @IsOptional()
  sipTech?: string; // defaults server-side
}
