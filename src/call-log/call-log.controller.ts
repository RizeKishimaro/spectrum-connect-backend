
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
  Req,
  Query,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger'
import { CallLogService } from './call-log.service'
import { CreateCallLogDto, UpdateCallLogDto } from './dto'
import { CallLog } from '@prisma/client'

@ApiTags('CallLogs')
@Controller('call-logs')
export class CallLogController {
  constructor(private readonly service: CallLogService) { }

  @Post()
  @ApiOperation({ summary: 'Create a call log~ 💬' })
  @ApiBody({ type: CreateCallLogDto })
  @ApiResponse({ status: 201, description: 'Call log created successfully~ ✨', type: Object })
  create(@Body() dto: CreateCallLogDto) {
    return this.service.create(dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all call logs~ 🗂️' })
  @ApiResponse({ status: 200, description: 'List of call logs~ 💖', type: [Object] })
  async findAll(@Req() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    const data = await this.service.findAll(req.user, page, +limit)
    return data
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific call log by ID~ 🔍' })
  @ApiParam({ name: 'id', required: true, description: 'Call log ID~' })
  @ApiResponse({ status: 200, description: 'The call log~ ☎️', type: Object })
  @ApiResponse({ status: 404, description: 'Call log not found~ 😿' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a call log by ID~ 🛠️' })
  @ApiParam({ name: 'id', required: true, description: 'Call log ID~' })
  @ApiBody({ type: UpdateCallLogDto })
  @ApiResponse({ status: 200, description: 'Updated successfully~ 🎉', type: Object })
  @ApiResponse({ status: 404, description: 'Call log not found~ 😿' })
  update(@Param('id') id: string, @Body() dto: UpdateCallLogDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a call log by ID~ 💔' })
  @ApiParam({ name: 'id', required: true, description: 'Call log ID~' })
  @ApiResponse({ status: 200, description: 'Deleted successfully~ 🌈' })
  @ApiResponse({ status: 404, description: 'Call log not found~ 😿' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}

