import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Sse, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SystemManagerService } from './system-manager.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { ExpressRequest } from 'src/types/other';
import { PublicRoute } from 'src/utils/decorators/public.decorator';
import { interval, map, Observable } from 'rxjs';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { CreateSipEndpointDto } from './dto/create-sip-endpoints.dto';
import { UpdateSipEndpointDto } from './dto/update-sip-endpoint.dto';
import { UserSettingsDto } from './dto/user-settings.dto';
import { CreateDIDNumberDTO } from './dto/create-didnumber.dto';

@Controller('system-manager')
export class SystemManagerController {
  constructor(private readonly systemManagerService: SystemManagerService) { }

  @Sse('usage')
  sendMetrics(): Observable<any> {
    return new Observable((observer) => {
      const intervalId = setInterval(async () => {
        try {
          const [cpu, memory, disk, network] = await Promise.all([
            this.systemManagerService.getCpuUsage(),
            this.systemManagerService.getMemoryUsage(),
            this.systemManagerService.getDiskUsage(),
            this.systemManagerService.getNetworkUsage(),
          ]);

          const timestamp = new Date().toISOString();

          observer.next({
            data: {
              cpu,
              memory,
              disk,
              network,
              timestamp,
            },
          });
        } catch (err) {
          console.error('Mila-chan error during metric fetch! 😿💥', err);
          observer.error(err); // This will close the connection on error!
        }
      }, 2000); // every 2 seconds

      return () => {
        clearInterval(intervalId);
        console.log('Mila-chan stopped metrics stream! 💫👋');
      };
    });
  }
  @Get('asterisk/status')
  async getAsteriskStatus() {
    const channels = await this.systemManagerService.sendCommand('core show channels');
    const uptime = await this.systemManagerService.sendCommand('core show uptime');
    const pjsipPeers = await this.systemManagerService.sendCommand('pjsip show endpoints');
    const systemVersion = await this.systemManagerService.sendCommand('core show version');
    const response = await this.systemManagerService.checkPing()

    return {
      systemVersion,
      uptime,
      activeCalls: channels,
      pjsipPeers,
      response
    };
  }

  @Post("/create-extension/")
  createExtension(@Body() dto: CreateExtensionDto) {
    return this.systemManagerService.createExtension(dto);
  }

  @Get("extensions")
  findExtensions(@Query('search') search?: string) {
    return this.systemManagerService.findExtensions(search);
  }

  @Get('extensions/:id')
  findExtension(@Param('id') id: string) {
    return this.systemManagerService.findExtension(id);
  }

  @Patch('extensions/:id')
  updateExtension(@Param('id') id: string, @Body() dto: UpdateExtensionDto) {
    return this.systemManagerService.updateExtension(id, dto);
  }

  @Delete('extensions/:id')
  removeExtension(@Param('id') id: string) {
    return this.systemManagerService.removeExtension(id);
  }
  @Post("sip-endpoint")
  create(@Body() dto: CreateSipEndpointDto) {
    return this.systemManagerService.create(dto);
  }

  @Get("sip-endpoints")
  findAll(@Query('search') search?: string) {
    return this.systemManagerService.findAll(search);
  }

  @Get("did-number")
  async getAllDIDNumbers() {
    const data = await this.systemManagerService.getAllDIDNumber()
    return data

  }
  @Post("did-number")
  async createDIDNumber(@Body() dto: CreateDIDNumberDTO) {
    return await this.systemManagerService.createDIDNumber(dto)
  }

  @Get('sip-endpoints/:id')
  findOne(@Param('id') id: string) {
    return this.systemManagerService.findOne(id);
  }
  @Get("sip-endpoints/:id/didNumbers")
  async findDIDNumbers(@Param("id") endpointId: string) {
    return await this.systemManagerService.getEndpointDIDInformation(endpointId)
  }




  @Patch("did-number/:id")
  async updateDIDNumber(@Param("id") id: string, @Body() dto: CreateDIDNumberDTO) {
    return await this.systemManagerService.updateDIDNumber(id, dto)
  }

  @Delete("did-number/:id")
  async deleteDIDNumber(@Param("id") id: string) {
    return await this.systemManagerService.deleteDIDNumber(id)
  }

  @Patch('sip-endpoints/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSipEndpointDto) {
    return this.systemManagerService.update(id, dto);
  }

  @Delete('sip-endpoints/:id')
  remove(@Param('id') id: string) {
    return this.systemManagerService.remove(id);
  }



  @PublicRoute()
  @Get("core-status")
  async getCoreStatus() {
    const data = await this.systemManagerService.getCoreStatus()
    return data;
  }

  @PublicRoute()
  @Get("error-reports")
  async getLogs() {
    return await this.systemManagerService.getErrorReport();
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

  @Get('spy')
  async spyOnAgentCalls(
    @Query('account') account: string,
    @Query('spyaccount') spyaccount: string,
  ) {
    return this.systemManagerService.spyOnAgents(account, spyaccount);
  }

  @Post("save-settings")
  async saveUserSettings(@Body() settingsDto: UserSettingsDto, @Req() req: ExpressRequest) {
    return this.systemManagerService.saveUserSettings(settingsDto, req.user.user.systemCompanyId)
  }
  @Get("get-settings")
  async getUserSettings(@Req() req: ExpressRequest) {
    return this.systemManagerService.getUserSettings(req.user.user.systemCompanyId)
  }
}
