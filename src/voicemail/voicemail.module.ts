import { Module } from '@nestjs/common';
import { VoicemailService } from './voicemail.service';
import { VoicemailController } from './voicemail.controller';

@Module({
  controllers: [VoicemailController],
  providers: [VoicemailService],
})
export class VoicemailModule {}
