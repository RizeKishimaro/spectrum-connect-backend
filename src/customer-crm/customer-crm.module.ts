import { Module } from '@nestjs/common';
import { CustomerCrmService } from './customer-crm.service';
import { CustomerCrmController } from './customer-crm.controller';
import { CompanyMembersController } from './utils/company-members.controller';
import { CompanyMembersService } from './utils/company-members.service';

@Module({
  controllers: [CompanyMembersController, CustomerCrmController,],
  providers: [CustomerCrmService, CompanyMembersService],
})
export class CustomerCrmModule { }
