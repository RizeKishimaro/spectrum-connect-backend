import { Test, TestingModule } from '@nestjs/testing';
import { SipLogService } from './sip-log.service';

describe('SipLogService', () => {
  let service: SipLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SipLogService],
    }).compile();

    service = module.get<SipLogService>(SipLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
