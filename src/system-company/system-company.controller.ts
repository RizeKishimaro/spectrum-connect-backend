
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SystemCompanyService } from './system-company.service';
import { CreateSystemCompanyDto, UpdateSystemCompanyDto } from './dto';

@ApiTags('System Company')
@Controller('system-company')
export class SystemCompanyController {
  constructor(private readonly service: SystemCompanyService) { }

  @Post()
  @ApiBody({ type: CreateSystemCompanyDto })
  @ApiResponse({ status: 201, description: 'Created SystemCompany' })
  create(@Body() dto: CreateSystemCompanyDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List all SystemCompanies' })
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Get SystemCompany by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiBody({ type: UpdateSystemCompanyDto })
  @ApiResponse({ status: 200, description: 'Updated SystemCompany' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSystemCompanyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Deleted SystemCompany' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

