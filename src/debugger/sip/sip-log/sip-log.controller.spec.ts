import { Test, TestingModule } from '@nestjs/testing';
import { SipLogController } from './sip-log.controller';

describe('SipLogController', () => {
  let controller: SipLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SipLogController],
    }).compile();

    controller = module.get<SipLogController>(SipLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
