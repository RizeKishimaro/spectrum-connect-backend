import { Test, TestingModule } from '@nestjs/testing';
import { VoicemailController } from './voicemail.controller';
import { VoicemailService } from './voicemail.service';

describe('VoicemailController', () => {
  let controller: VoicemailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoicemailController],
      providers: [VoicemailService],
    }).compile();

    controller = module.get<VoicemailController>(VoicemailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
