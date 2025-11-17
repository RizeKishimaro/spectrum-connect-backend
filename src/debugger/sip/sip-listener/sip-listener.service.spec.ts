import { Test, TestingModule } from '@nestjs/testing';
import { SipListenerService } from './sip-listener.service';

describe('SipListenerService', () => {
  let service: SipListenerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SipListenerService],
    }).compile();

    service = module.get<SipListenerService>(SipListenerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
