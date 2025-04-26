
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'supersecretpassword' })
  password: string;

  @ApiProperty({ example: 'sip12345' })
  sipUser: string;

  @ApiProperty({ example: 's1pPa$$' })
  sipPass: string;
}

