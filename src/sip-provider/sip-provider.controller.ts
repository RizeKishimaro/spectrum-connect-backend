
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SipProviderService } from './sip-provider.service';
import { CreateSIPProviderDto, UpdateSIPProviderDto } from './dto';

@ApiTags('SIP Provider')
@Controller('sip-provider')
export class SipProviderController {
  constructor(private readonly service: SipProviderService) { }

  @Post()
  @ApiBody({ type: CreateSIPProviderDto })
  @ApiResponse({ status: 201, description: 'Created SIP Provider' })
  create(@Body() dto: CreateSIPProviderDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List all SIP Providers' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Get a SIP Provider by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiBody({ type: UpdateSIPProviderDto })
  @ApiResponse({ status: 200, description: 'Updated SIP Provider' })
  update(@Param('id') id: string, @Body() dto: UpdateSIPProviderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Deleted SIP Provider' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

