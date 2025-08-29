import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';


export class CreateCompanyMemberDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;
}


export class UpdateCompanyMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
