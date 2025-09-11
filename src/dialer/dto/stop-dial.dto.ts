import { IsOptional, IsString } from 'class-validator';


export class StopDialDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
