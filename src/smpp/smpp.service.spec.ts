import { Test, TestingModule } from '@nestjs/testing';
import { SmppService } from './smpp.service';

describe('SmppService', () => {
  let service: SmppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmppService],
    }).compile();

    service = module.get<SmppService>(SmppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
