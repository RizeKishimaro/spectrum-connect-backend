
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
import { RtpAddressService } from './rtp-address.service';
import { CreateRtpAddressDto, UpdateRtpAddressDto } from './dto';

@ApiTags('RTP Address')
@Controller('rtp-address')
export class RtpAddressController {
  constructor(private readonly service: RtpAddressService) { }

  @Post()
  @ApiBody({ type: CreateRtpAddressDto })
  @ApiResponse({ status: 201, description: 'Created RTPAddress' })
  create(@Body() dto: CreateRtpAddressDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List all RTPAddresses' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Get RTPAddress by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiBody({ type: UpdateRtpAddressDto })
  @ApiResponse({ status: 200, description: 'Updated RTPAddress' })
  update(@Param('id') id: string, @Body() dto: UpdateRtpAddressDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Deleted RTPAddress' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

