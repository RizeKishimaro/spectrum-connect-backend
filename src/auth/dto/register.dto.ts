
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'supersecretpassword' })
  password: string;

  @ApiProperty({ example: 'sip12345' })
  sipUser: string;

  @ApiProperty({ example: 's1pPa$$' })
  sipPass: string;

  @ApiProperty({ example: Role.company_user, enum: Role })
  roles: string;

  @ApiProperty({ example: 1 })
  systemCompanyId: number;
}

