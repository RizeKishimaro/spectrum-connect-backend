import { Module } from '@nestjs/common';
import { SystemCompanyService } from './system-company.service';
import { SystemCompanyController } from './system-company.controller';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Module({
  controllers: [SystemCompanyController],
  providers: [SystemCompanyService],
})
export class SystemCompanyModule { }
