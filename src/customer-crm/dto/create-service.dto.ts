import { IsNotEmpty, IsString } from 'class-validator';


export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name!: string; // systemCompanyId is derived from req
}
