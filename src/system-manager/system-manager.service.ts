import { BadGatewayException, BadRequestException, forwardRef, HttpStatus, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AgentService } from 'src/agent/agent.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';
import { deleteIVRTree, generateDialplan, IvrNode, saveIvrDialplan, writeDialplanToFile } from 'src/utils/dialplan/dialplan-manager';
import { extname, join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { AMIProvider } from 'src/utils/providers/ami/ami-provider.service';
import { exec as execCb } from 'child_process'
import { promisify } from 'util';
import si from 'systeminformation'
import { CreateSipEndpointDto } from './dto/create-sip-endpoints.dto';
import { UpdateSipEndpointDto } from './dto/update-sip-endpoint.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { PrismaService } from 'src/utils/prisma/prisma.service';
import { UserSettingsDto } from './dto/user-settings.dto';
import { ExpressRequest } from 'src/types/other';
import { CreateDIDNumberDTO } from './dto/create-didnumber.dto';
import { UpdateDIDNumberDTO } from './dto/update-didnumber.dto';

const exec = promisify(execCb)

@Injectable()
export class SystemManagerService {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly parkedCallService: ParkedCallService,
    private readonly prismaService: PrismaService,
    private readonly ami: AMIProvider
  ) {
  }

  private readLastLines(filePath: string, lineCount = 20): string[] {
    if (!fs.existsSync(filePath)) return [];
    const file = fs.readFileSync(filePath, 'utf-8');
    const lines = file.split('\n');
    return lines.slice(-lineCount);
  }

  private matchMessages(lines: string[], patterns: string[]): string[] {
    return lines.filter(line =>
      patterns.some(pattern => line.includes(pattern))
    );
  }

  async getErrorReport() {
    const logs = {
      nginx: '/var/log/nginx/access.log',
      asterisk: '/var/log/asterisk/messages',
      pm2: '/home/rizekishimaro/.npm/_logs/2025-06-16T03_22_10_662Z-eresolve-report.txt',
    };

    const results: Record<string, string[]> = {};

    results.nginx = this.readLastLines(logs.nginx);
    // results.nginx = this.matchMessages(nginxLines, this.nginxMessages);

    results.asterisk = this.readLastLines(logs.asterisk);
    // results.asterisk = this.matchMessages(asteriskLines, this.asteriskMessages);

    results.pm2 = this.readLastLines(logs.pm2);
    // results.pm2 = this.matchMessages(pm2Lines, this.pm2Messages);

    return results;
  }
  async getDashboardData(companyId: number) {


  }
  async spyOnAgents(account: string, supervisoraccount: string) {
    const formattedSip = `PJSIP/${supervisoraccount}`;
    const response = await this.ami.action({
      Action: 'Originate',
      Channel: formattedSip,
      Context: 'spy-agent',
      Exten: 'spy',
      Priority: 1,
      CallerID: 'Supervisor',
      Variable: `spyacc=${account}`,
    });

    return {
      statusCode: HttpStatus.OK,
      message: "success",
      response
    }
  }

  async getStatus(): Promise<any> {

    function normalizeOutput(output: string | string[] | undefined): string[] {
      if (!output) return [];
      if (Array.isArray(output)) return output;
      return output.split('\n'); // Split big string into lines
    }
    const coreShowChannels = await this.sendCommand('core show channels');
    const sipShowPeers = await this.sendCommand('sip show peers');
    const pjsipShowEndpoints = await this.sendCommand('pjsip show endpoints');
    const uptime = await this.sendCommand('core show uptime');

    return {
      coreShowChannels,
      sipShowPeers,
      pjsipShowEndpoints,
      uptime,
    };
  }

  async checkPing() {
    const res = this.ami.action({
      action: "ping"
    })
    return res
  }

  async isPjsipUserOnline(extension: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const actionId = `check-pjsip-${Date.now()}`;
      let deviceState: string | undefined;

      const onRawEvent = (evt: any) => {
        if (evt.actionid !== actionId) return;

        switch (evt.event) {
          case 'EndpointDetail':
            deviceState = evt.devicestate?.toLowerCase();
            resolve(deviceState === 'not in use');
            break;

          case 'EndpointDetailComplete':
            this.ami.removeListener('rawevent', onRawEvent);
            resolve(deviceState === 'not in use');
            break;

        }
      };

      this.ami.on('rawevent', onRawEvent);

      this.ami.action({
        action: 'PJSIPShowEndpoint',
        endpoint: extension,
        actionid: actionId,
      },);
    });
  }


  async sendCommand(cmd: string): Promise<string[]> {
    try {
      const data = await this.ami.action({
        Action: 'Command',
        Command: cmd,
      });

      const output = data?.Output || data?.output || "";
      return Array.isArray(output) ? output : output.split('\n');
    } catch (err) {
      console.error("AMI command failed, nyaaa~ 🥹:", err);
      return []; // or throw err if you want the error to bubble up
    }
  }


  // @Interval(10000)
  async autoBridgeParkedCalls() {
    const calls = await this.parkedCallService.getActiveParkedCalls();
    const agents = await this.agentService.getAvailableAgent();
    console.log(calls)

    if (calls.length && agents.length) {
      const call = calls[0];
      const agent = agents[0];
      const callChannel = call.sipChannel; // e.g. PJSIP/1001-00000006
      const agentChannel = `PJSIP/${agent.sipUname}`;

      console.log(`🌈 Bridging parked call ${call.sipChannel} to agent ${agent.sipUname}`);

      const data = await this.ami.action({
        Action: 'Redirect',
        Channel: callChannel,
        ExtraChannel: agentChannel,
        Context: 'local-endpoint',
        Exten: 's',
        Priority: 1,
      });
      console.log(data)

      this.parkedCallService.unparkCall(call.id)
    }
  }

  async saveIVRTree(
    body: { id?: string; name: string; tree: IvrNode },
    systemCompanyId: number
  ) {
    const isUpdate = !!body.id;
    const timestampedName = `${body.name}}`;
    const jsonTree = JSON.stringify(body.tree);

    if (isUpdate) {
      const existing = await this.prismaService.iVRTree.findUnique({
        where: { id: body.id },
      });

      if (!existing) {
        throw new BadRequestException("IVR not found for update, nya~!");
      }

      await deleteIVRTree(existing);

      const updated = await this.prismaService.iVRTree.update({
        where: { id: body.id },
        data: {
          name: existing.name,
          tree: jsonTree,
        },
      });

      saveIvrDialplan(body.tree, existing.name);

      return {
        status: "success",
        message: `IVR Tree updated successfully nya~!`,
        data: updated,
      };
    } else {
      const tree = await this.prismaService.iVRTree.findUnique({
        where: {
          name: body.name
        }
      });
      if (tree) throw new BadRequestException("Duplicated Name Please choose Another")
      const created = await this.prismaService.iVRTree.create({
        data: {
          name: timestampedName,
          tree: jsonTree,
          systemCompanyId,
        },
      });

      saveIvrDialplan(body.tree, timestampedName);

      return {
        status: "success",
        message: `IVR Tree created successfully~ 💖`,
        data: created,
      };
    }
  }
  async getCoreStatus() {
    const checks = await Promise.all([
      this.checkAsterisk(),
      this.checkPostgres(),
      this.checkDiskSpace(),
      this.checkAgentPortal(),
      this.checkNginx(),
    ])

    return checks
  }

  private async checkAsterisk() {
    try {
      const data = await this.sendCommand('core show uptime')
      return {
        name: 'Asterisk PBX',
        status: data ? data[0].includes('System uptime') ? 'operational' : 'incident' : "incident",
        icon: 'Phone',
        description: 'Call processing system',
        lastUpdated: new Date().toISOString(),
      }
    } catch {
      return {
        name: 'Asterisk PBX',
        status: 'incident',
        icon: 'Phone',
        description: 'Call processing system',
        lastUpdated: new Date().toISOString(),
        message: 'Asterisk is unreachable!',
      }
    }
  }

  private async checkPostgres() {
    try {
      const { stdout } = await exec('pg_isready')
      if (!stdout) {
        return {
          name: 'Database',
          status: 'incident',
          icon: 'Database',
          description: 'PostgreSQL database',
          lastUpdated: new Date().toISOString(),
          message: 'Database not responding',
        }

      }
      const status = stdout.includes('accepting connections') ? 'operational' : 'incident'
      return {
        name: 'Database',
        status,
        icon: 'Database',
        description: 'PostgreSQL database',
        lastUpdated: new Date().toISOString(),
      }
    } catch {
      return {
        name: 'Database',
        status: 'incident',
        icon: 'Database',
        description: 'PostgreSQL database',
        lastUpdated: new Date().toISOString(),
        message: 'Database not responding',
      }
    }
  }

  private async checkDiskSpace() {
    const { stdout } = await exec('df -h /')
    if (!stdout) {
      return {
        name: 'Call Recording',
        status: "incident",
        icon: 'Server',
        description: 'Disk usage for call recordings',
        lastUpdated: new Date().toISOString(),
        message: `Unable to check DiskStorage`,
      }

    }
    const lines = stdout.split('\n')
    const rootDisk = lines[1]?.split(/\s+/)
    const used = rootDisk?.[4] || 'Unknown'

    const percent = parseInt(used)
    let status = 'operational'
    if (percent >= 85) status = 'incident'
    else if (percent >= 70) status = 'degraded'

    return {
      name: 'Call Recording',
      status,
      icon: 'Server',
      description: 'Disk usage for call recordings',
      lastUpdated: new Date().toISOString(),
      message: `Disk usage at ${used}`,
    }
  }

  private async checkAgentPortal() {
    try {
      const res = await fetch('http://localhost:5173', { method: 'GET' })
      return {
        name: 'Agent Portal',
        status: res.ok ? 'operational' : 'incident',
        icon: 'Users',
        description: 'Frontend for agents',
        lastUpdated: new Date().toISOString(),
      }
    } catch {
      return {
        name: 'Agent Portal',
        status: 'incident',
        icon: 'Users',
        description: 'Frontend for agents',
        lastUpdated: new Date().toISOString(),
        message: 'Agent Portal unreachable',
      }
    }
  }

  private async checkNginx() {
    try {
      const { stdout } = await exec('systemctl is-active nginx')
      return {
        name: 'Web Server',
        status: stdout.trim() === 'active' ? 'operational' : 'incident',
        icon: 'Server',
        description: 'Nginx server status',
        lastUpdated: new Date().toISOString(),
      }
    } catch {
      return {
        name: 'Web Server',
        status: 'incident',
        icon: 'Server',
        description: 'Nginx server status',
        lastUpdated: new Date().toISOString(),
        message: 'Nginx not running',
      }
    }
  }
  async getCpuUsage(): Promise<number> {
    const load = await si.currentLoad()
    return Math.round(load.currentLoad) // percentage
  }

  async getMemoryUsage(): Promise<number> {
    const mem = await si.mem()
    const used = (mem.active / mem.total) * 100
    return Math.round(used)
  }


  async getDiskUsage(): Promise<number> {
    const fs = await si.fsSize()

    // Sum total used and total size from all partitions
    const totalUsed = fs.reduce((acc, partition) => acc + partition.used, 0)
    const totalSize = fs.reduce((acc, partition) => acc + partition.size, 0)

    // Calculate usage percentage overall
    const usedPercent = (totalUsed / totalSize) * 100

    return Math.round(usedPercent)
  }




  async getNetworkUsage(): Promise<number> {
    const stats = await si.networkStats()
    const iface = stats[0]

    const bytesPerSec = iface.rx_sec + iface.tx_sec

    const bitsPerSec = bytesPerSec * 8

    const mbps = bitsPerSec / 1_000_000

    return Math.round(mbps * 100) / 100
  }

  async deleteIVRTree(id: string, systemCompanyId: number) {
    const ivr = await this.prismaService.iVRTree.findUnique({
      where: { id, systemCompanyId },
    });
    if (!ivr || (ivr.systemCompanyId !== systemCompanyId)) {
      throw new BadRequestException("IVR not found or access denied! (｡•́︿•̀｡)");
    }
    deleteIVRTree(ivr)
    await this.prismaService.iVRTree.delete({
      where: { id, systemCompanyId },
    });
    this.ami.action({
      Action: "Command",
      Command: "pjsip reload"
    })
    return {
      status: HttpStatus.OK,
      message: "Successfully Deleted IVR Node",
    }
  }

  saveIVRFiles(file: Express.Multer.File, systemCompanyId) {
    const outputDir = join(process.cwd(), 'public', 'sounds')

    const outputFilename = file.originalname
      .replace(extname(file.originalname), '.wav')
      .toLowerCase()
      .replace(/\s+/g, '_');
    const outputPath = join(outputDir, outputFilename)

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

    return new Promise(async (resolve, reject) => {
      ffmpeg(file.path) // ✅ Use actual uploaded file path
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(8000)
        .format('wav')
        .on('end', async () => {
          try {
            fs.unlinkSync(file.path) // ✅ Delete by actual path

            const stats = fs.statSync(outputPath)
            const publicUrl = `/sounds/${outputFilename}`

            const saved = await this.prismaService.ivrFiles.create({
              data: {
                file_name: outputFilename,
                file_size: stats.size,
                file_type: file.mimetype,
                file_url: publicUrl,

                company: {
                  connect: { id: systemCompanyId }
                }

              },
            })

            resolve({
              message: 'IVR file uploaded, converted, and saved successfully~! ✨',
              ...saved,
            })
          } catch (err) {
            reject(new BadRequestException(`DB or FS error: ${err.message}`))
          }
        })
        .on('error', (err) => {
          reject(new BadRequestException(`FFmpeg error: ${err.message}`))
        })
        .save(outputPath)
    })
  }
  async getIVRTree(systemCompanyId: number) {
    const ivrTreeName = await this.prismaService.iVRTree.findMany({
      where: {
        systemCompanyId,
      },
      select: {
        name: true,
        id: true
      }
    })
    return ivrTreeName
  }
  async findIVRNode(id: string, systemCompanyId: number) {
    const ivrNode = await this.prismaService.iVRTree.findUnique({
      where: {
        id,
        systemCompanyId,
      }
    })
    return ivrNode
  }

  async getIvrFiles() {
    const ivrFiles = this.prismaService.ivrFiles.findMany({
      where: {}
    })
    return ivrFiles
  }

  async deleteIVRFile(id: string) {
    try {
      const ivrFile = await this.prismaService.ivrFiles.findUnique({ where: { id } })

      if (!ivrFile) {
        throw new NotFoundException("Nyaa~ File not found! (｡•́︿•̀｡)")
      }

      const fullPath = join(process.cwd(), 'public', ivrFile.file_url)

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      } else {
        console.warn(`Mila couldn't find the file on disk: ${fullPath} ~ Maybe it's already gone?`)
      }

      await this.prismaService.ivrFiles.delete({ where: { id } })

      return {
        message: `IVR file "${ivrFile.file_name}" deleted successfully~! 🗑️💕`,
      }
    } catch (err) {
      console.error("Delete error:", err)
      throw new BadRequestException(`Couldn’t delete file! Error: ${err.message}`)
    }
  }


  async create(dto: CreateSipEndpointDto) {
    return this.prismaService.sIPEndpoints.create({
      data: {
        name: dto.name,
        ipHost: dto.ipHost ?? '0.0.0.0',
        sipTech: dto.sipTech ?? 'pjsip',
        DIDNumbers: dto.didIds
          ? {
            connect: dto.didIds.map((id) => ({ id })),
          }
          : undefined,
      },
      include: {
        DIDNumbers: true,
      },
    });
  }

  async findAll(search?: string) {
    return this.prismaService.sIPEndpoints.findMany({
      where: search
        ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { ipHost: { contains: search } },
            { sipTech: { contains: search, mode: 'insensitive' } },
          ],
        }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: { settings: true, DIDNumbers: true },
    });
  }

  async findOne(id: string) {
    const item = await this.prismaService.sIPEndpoints.findUnique({
      where: { id },
      include: { settings: true },
    });
    if (!item) throw new NotFoundException('SIPEndpoint not found');
    return item;
  }




  async update(id: string, dto: UpdateSipEndpointDto) {
    await this.ensureExists(id);

    return this.prismaService.sIPEndpoints.update({
      where: { id },
      data: {
        name: dto.name,
        ipHost: dto.ipHost ?? "0.0.0.0",
        sipTech: dto.sipTech ?? "pjsip",

        // only handle DID numbers
        DIDNumbers: dto.didIds
          ? {
            set: dto.didIds.map((didId) => ({ id: didId })),
          }
          : undefined,
      },
      include: {
        DIDNumbers: true,
      },
    });
  }



  async remove(id: string) {
    await this.ensureExists(id);
    await this.prismaService.sIPEndpoints.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const hit = await this.prismaService.sIPEndpoints.findUnique({ where: { id } });
    if (!hit) throw new NotFoundException('SIPEndpoint not found');
  }


  createExtension(dto: CreateExtensionDto) {
    return this.prismaService.extensions.create({ data: { name: dto.name } });
  }

  findExtensions(search?: string) {
    return this.prismaService.extensions.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { settings: true },
    });
  }

  async findExtension(id: string) {
    const hit = await this.prismaService.extensions.findUnique({
      where: { id },
      include: { settings: true },
    });
    if (!hit) throw new NotFoundException('Extension not found');
    return hit;
  }

  async updateExtension(id: string, dto: UpdateExtensionDto) {
    await this.ensureExists(id);
    return this.prismaService.extensions.update({ where: { id }, data: { name: dto.name } });
  }

  async removeExtension(id: string) {
    await this.ensureExists(id);
    await this.prismaService.extensions.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExistsExtension(id: string) {
    const hit = await this.prismaService.extensions.findUnique({ where: { id } });
    if (!hit) throw new NotFoundException('Extension not found');
  }


  async saveUserSettings(settingsDto: UserSettingsDto, systemCompanyId: number) {
    const settings = await this.prismaService.settings.findFirst({
      where: { systemCompanyId },
    });
    console.log(settingsDto, systemCompanyId)

    if (settings) {
      const updatedSettings = await this.prismaService.settings.update({
        where: { id: settings.id },
        data: {
          blastCount: settingsDto.blastCount,
          callLimit: settingsDto.callLimit,
          sipProviderId: settingsDto.sipProviderId ?? null,
          ivrId: settingsDto.ivrId ?? null,
          dIDNumberId: settingsDto.didNumberId ?? null,
        },
      });
      return updatedSettings;
    } else {
      const createdSettings = await this.prismaService.settings.create({
        data: {
          systemCompanyId,
          blastCount: settingsDto.blastCount,
          callLimit: settingsDto.callLimit,
          sipProviderId: settingsDto.sipProviderId ?? null,
          ivrId: settingsDto.ivrId ?? null,
          dIDNumberId: settingsDto.didNumberId ?? null,
        },
      });
      return createdSettings;
    }
  }
  async getUserSettings(systemCompanyId: number) {
    const settings = await this.prismaService.settings.findFirst({
      where: { systemCompanyId }
    });
    return settings;
  }

  async getEndpointDIDInformation(endpointId: string) {
    const didNumbers = await this.prismaService.dIDNumbers.findMany({
      where: { sIPEndpointsId: endpointId }
    });

    return didNumbers;
  }

  async getAllDIDNumber() {
    const didNumbers = await this.prismaService.dIDNumbers.findMany({
      include: {
        SIPEndpoints: true
      }
    });
    return didNumbers;
  }

  async createDIDNumber(dto: CreateDIDNumberDTO) {
    return this.prismaService.dIDNumbers.create({ data: { ...dto } });
  }

  async deleteDIDNumber(id: string) {
    return this.prismaService.dIDNumbers.delete({
      where: {
        id
      }
    })
  }

  async updateDIDNumber(id: string, dto: UpdateDIDNumberDTO) {
    return this.prismaService.dIDNumbers.update({
      where: {
        id
      },
      data: {
        ...dto
      }
    })
  }

}
