import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SystemManagerService } from './system-manager.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { ExpressRequest } from 'src/types/other';
import { PublicRoute } from 'src/utils/decorators/public.decorator';

@Controller('system-manager')
export class SystemManagerController {
  constructor(private readonly systemManagerService: SystemManagerService) { }
  @Get('asterisk/status')
  async getAsteriskStatus() {
    const channels = await this.systemManagerService.sendCommand('core show channels');
    const uptime = await this.systemManagerService.sendCommand('core show uptime');
    const pjsipPeers = await this.systemManagerService.sendCommand('pjsip show endpoints');
    const systemVersion = await this.systemManagerService.sendCommand('core show version');
    const response = await this.systemManagerService.checkPing()
    console.log(channels, uptime, pjsipPeers, systemVersion, response)

    return {
      systemVersion,
      uptime,
      activeCalls: channels,
      pjsipPeers,
      response
    };
  }

  @Get("ivr-files")
  async getIVRFiles() {
    console.log("getIVRFiles")
    return this.systemManagerService.getIvrFiles()
  }

  @Post("saveIVRTree")
  async saveIVRTree(@Body() body: any, @Req() req: ExpressRequest) {
    this.systemManagerService.saveIVRTree(body, req.user.user.systemCompanyId)
    return body
  }
  @Get("ivr-trees")
  async getIVRTrees(@Req() req: ExpressRequest) {
    return this.systemManagerService.getIVRTree(req.user.user.systemCompanyId)
  }
  @Get("getDashboardData")
  async getDashboardData(@Req() req: ExpressRequest) {
    this.systemManagerService.getDashboardData(req.user.user.systemCompanyId)
  }

  @Get('ivr-tree/:id')
  async getIVRTree(@Param("id") id: string, @Req() req: ExpressRequest) {
    return this.systemManagerService.findIVRNode(id, req.user.user.systemCompanyId)
  }

  @Post('upload-ivr')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'public', "sounds"),
        filename: (req, file, cb) => {
          const filename = uuidv4() + extname(file.originalname);
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(mp3|wav)$/)) {
          return cb(new BadRequestException('Only audio files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadIVR(@UploadedFile() file: Express.Multer.File, @Req() req: ExpressRequest) {
    return this.systemManagerService.saveIVRFiles(file, req.user.user.systemCompanyId)
  }

  @Post("delete-ivr-file")
  async deleteIvrFile(@Body() dto: { id: string }) {
    return this.systemManagerService.deleteIVRFile(dto.id)
  }

  @Delete("remove-ivr-tree/:id")
  async removeIVRTree(@Param("id") id: string, @Req() req: ExpressRequest) {
    return this.systemManagerService.deleteIVRTree(id, req.user.user.systemCompanyId)
  }

}
