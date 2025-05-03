import { PartialType } from '@nestjs/swagger';
import { CreateSystemCompanyDto } from './create-system-company.dto';

export class UpdateSystemCompanyDto extends PartialType(CreateSystemCompanyDto) { }

