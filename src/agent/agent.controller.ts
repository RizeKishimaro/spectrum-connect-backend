
import {
  Controller, Get, Post, Body, Patch, Param, Delete
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './dto';
import { AgentEntity } from './entities/agent.entity';

@ApiTags('Agents')
@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) { }

  @Post()
  @ApiResponse({ type: AgentEntity })
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentService.create(createAgentDto);
  }

  @Get()
  @ApiResponse({ type: [AgentEntity] })
  findAll() {
    return this.agentService.findAll();
  }

  @Get(':id')
  @ApiResponse({ type: AgentEntity })
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Get(":id/getOverviewData")

  @Patch(':id')
  @ApiResponse({ type: AgentEntity })
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @ApiResponse({ type: AgentEntity })
  remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }
}

