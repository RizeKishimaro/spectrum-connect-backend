import { Test, TestingModule } from '@nestjs/testing';
import { SystemManagerService } from './system-manager.service';

describe('SystemManagerService', () => {
  let service: SystemManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemManagerService],
    }).compile();

    service = module.get<SystemManagerService>(SystemManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
