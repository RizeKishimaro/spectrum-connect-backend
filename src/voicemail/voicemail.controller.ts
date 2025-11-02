
// src/voicemail/voicemail.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { VoicemailService } from './voicemail.service';

@Controller('voicemail')
export class VoicemailController {
  constructor(private voicemailService: VoicemailService) { }

  @Post('new')
  async handleVoicemail(@Body() data: any) {
    const { mailbox, new: count } = data;
    console.log(`New voicemail for ${mailbox}, total new: ${count}`);
    return this.voicemailService.syncNewMail(mailbox);
  }

  @Get('agent/:agentId')
  async getAgentVoicemails(@Param('agentId') agentId: string) {
    return this.voicemailService.listAgentVoicemails(agentId);
  }
}

