import { IsOptional, IsString } from 'class-validator';


export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;
}
