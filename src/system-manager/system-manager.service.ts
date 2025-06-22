import { BadRequestException, forwardRef, HttpStatus, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import ManagerFactory from 'asterisk-manager';
import { AgentService } from 'src/agent/agent.service';
import { ParkedCallService } from 'src/parked-call/parked-call.service';
import { generateDialplan, IvrNode, saveIvrDialplan, writeDialplanToFile } from 'src/utils/dialplan/dialplan-manager';
import { extname, join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class SystemManagerService {
  private ami;

  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    private readonly parkedCallService: ParkedCallService,
    private readonly prismaService: PrismaService
  ) {
    this.ami = ManagerFactory(
      Number(process.env.AMI_PORT),
      process.env.AMI_HOST,
      process.env.AMI_USERNAME,
      process.env.AMI_PASSWORD,
      true
    );
  }

  async getStatus(): Promise<any> {
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
    this.ami.keepConnected();
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
      }, (err) => {
        if (err) {
          this.ami.removeListener('rawevent', onRawEvent);
          reject(err);
        }
      });
    });
  }

  async sendCommand(cmd: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.ami.action(
        {
          Action: 'Command',
          Command: cmd,
        },
        (err, res) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.output || []);
          }
        }
      );
    });
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

  saveIVRTree(body: { name: string, tree: IvrNode }) {
    const uniquename = body.name + "-" + Date.now()
    // const content = generateDialplan(body.tree, uniquename);
    // writeDialplanToFile(content, join("/etc/asterisk/", "extensions-custom.conf"));
    saveIvrDialplan(body.tree, uniquename)
    return {
      status: "success",
      statusCode: HttpStatus.OK,
      message: "Saved IVR Tree to dialplan."
    }
  }

  saveIVRFiles(file: Express.Multer.File) {
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
                file_type: 'audio/wav', // It's now WAV after conversion
                file_url: publicUrl,
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
}
