
import {
  Controller, Get, Post, Body, Param, Delete, Put,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto';
import { BasicQuery } from 'src/utils/dto/query.dto';

@ApiTags('Subscriptions 💌')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new subscription 💖' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  create(@Body() dto: CreateSubscriptionDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions 🗃️' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  findAll(@Query() query: BasicQuery) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID 🔍' })
  @ApiResponse({ status: 200, description: 'The found subscription' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a subscription ✏️' })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subscription 🗑️' })
  @ApiResponse({ status: 200, description: 'Subscription deleted' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

