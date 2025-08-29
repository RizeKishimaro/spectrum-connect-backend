import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CompanyMembersService } from './company-members.service';
import { CreateCompanyMemberDto, UpdateCompanyMemberDto } from "../dto/company-members.dto";


@Controller('customer-crm/company-members')
export class CompanyMembersController {
  constructor(private readonly service: CompanyMembersService) { }


  private getCompanyId(req: any): number {
    const id = req?.user?.user?.systemCompanyId ?? Number(req?.headers?.['x-system-company-id']);
    if (!id) throw new BadRequestException('systemCompanyId missing');
    return Number(id);
  }


  @Get()
  list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    const systemCompanyId = this.getCompanyId(req);
    return this.service.list(systemCompanyId, search, orderBy);
  }


  @Post()
  create(@Req() req: any, @Body() dto: CreateCompanyMemberDto) {
    const systemCompanyId = this.getCompanyId(req);
    return this.service.create(systemCompanyId, dto);
  }


  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyMemberDto,
  ) {
    const systemCompanyId = this.getCompanyId(req);
    return this.service.update(systemCompanyId, id, dto);
  }


  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const systemCompanyId = this.getCompanyId(req);
    return this.service.remove(systemCompanyId, id);
  }
}
