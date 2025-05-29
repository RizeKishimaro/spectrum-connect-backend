
import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto, UpdatePasswordDto } from './dto';
import { AgentEntity } from './entities/agent.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { renameSync } from 'fs';
import { ExpressRequest } from 'src/types/other';

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
  findAll(@Req() req: any) {
    return this.agentService.findAll(req.user);
  }

  @Get(':id')
  @ApiResponse({ type: AgentEntity })
  findOne(@Param('id') id: string) {
    return this.agentService.findOne(id);
  }

  @Get(":id/getOverviewData")
  getOverviewData(@Param("id") id: string) {
    return this.agentService.getAgentOverview(id)
  }

  @Patch("updatePassword")
  updatePassword(
    @Body() body: UpdatePasswordDto,
    @Req() req: ExpressRequest,
  ) {
    return this.agentService.updatePassword(body, req.user.id)
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('profilePicture'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phoneNumber: { type: 'string' },
        sipUname: { type: 'string' },
        sipPassword: { type: 'string' },
        profilePicture: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ type: AgentEntity })
  update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateAgentDto: UpdateAgentDto,
  ) {
    if (file) {
      const newFileName = `${Date.now()}-${file.originalname}`;
      const newPath = join(process.cwd(), "public", "profiles", newFileName);

      renameSync(join(process.cwd(), "public", "profiles", file.filename), newPath);

      updateAgentDto.profilePicture = `${join("profiles", newFileName)}`;
    }

    return this.agentService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @ApiResponse({ type: AgentEntity })
  remove(@Param('id') id: string) {
    return this.agentService.remove(id);
  }
}

