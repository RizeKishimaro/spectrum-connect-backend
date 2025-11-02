import { Test, TestingModule } from '@nestjs/testing';
import { VoicemailService } from './voicemail.service';

describe('VoicemailService', () => {
  let service: VoicemailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoicemailService],
    }).compile();

    service = module.get<VoicemailService>(VoicemailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
