import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class AgentEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sipUname: string;

  @ApiProperty()
  sipPassword: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty({ enum: AgentStatus })
  status: AgentStatus;

  @ApiProperty()
  systemCompanyId: number;

  @ApiProperty()
  updatedAt: Date;
}

