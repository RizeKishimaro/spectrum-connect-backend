
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsString, MinLength, IsEnum, IsNumber, IsNumberString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecretpassword' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'sip12345' })
  @IsString()
  sipUser: string;

  @ApiProperty({ example: 's1pPa$$' })
  @IsString()
  sipPass: string;

  @ApiProperty({ example: Role.company_user, enum: Role })
  @IsEnum(Role)
  roles: Role;

  @ApiProperty({ example: 1 })
  @IsNumberString()
  systemCompanyId: number;
}

