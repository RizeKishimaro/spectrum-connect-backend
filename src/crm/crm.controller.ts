import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateCrmDto } from './dto/create-crm.dto';
import { UpdateCrmDto } from './dto/update-crm.dto';
import { PublicRoute } from 'src/utils/decorators/public.decorator';

@ApiTags('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @PublicRoute()
  @Post()
  @ApiOperation({ summary: 'Create CRM entry' })
  create(@Body() createCrmDto: CreateCrmDto) {
    return this.crmService.create(createCrmDto);
  }

  @PublicRoute()
  @Get()
  @ApiOperation({ summary: 'List all CRM entries 🗂️' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of CRM entries 💬',
    type: [Object],
  })
  async findAll(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const data = await this.crmService.findAll(req.user, +page, +limit);
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one CRM entry by ID' })
  findOne(@Param('id') id: string) {
    return this.crmService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a CRM entry' })
  update(@Param('id') id: string, @Body() updateCrmDto: UpdateCrmDto) {
    return this.crmService.update(id, updateCrmDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a CRM entry' })
  remove(@Param('id') id: string) {
    return this.crmService.remove(id);
  }
}
