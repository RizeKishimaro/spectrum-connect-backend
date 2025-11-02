
// src/voicemail/voicemail.service.ts
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PrismaService } from 'src/utils/prisma/prisma.service';

@Injectable()
export class VoicemailService {
  constructor(private prisma: PrismaService) { }

  async syncNewMail(mailbox: string) {
    // 🔍 Find agent by mailbox (you can store agent.sipUname == mailbox)
    const agent = await this.prisma.agent.findUnique({
      where: { sipUname: mailbox },
    });

    if (!agent) {
      console.warn(`⚠️ No agent found for mailbox: ${mailbox}`);
      return;
    }

    const baseDir = `/var/spool/asterisk/voicemail/default/${mailbox}/INBOX`;
    const files = await fs.readdir(baseDir);
    const wavs = files.filter(f => f.endsWith('.wav'));

    for (const file of wavs) {
      const fileUrl = `https://pbx.yourdomain.com/voicemail/${mailbox}/${file}`;

      // Avoid duplicates
      const exists = await this.prisma.voicemail.findFirst({
        where: { fileUrl },
      });
      if (exists) continue;

      await this.prisma.voicemail.create({
        data: {
          mailbox,
          agentId: agent.id,
          systemCompanyId: agent.systemCompanyId,
          fileUrl,
          callerId: 'unknown',
          duration: 0,
          isNew: true,
        },
      });
    }

    return { message: `Synced voicemails for ${agent.name}` };
  }

  async listAgentVoicemails(agentId: string) {
    return this.prisma.voicemail.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

