import { Test, TestingModule } from '@nestjs/testing';
import { SmppController } from './smpp.controller';
import { SmppService } from './smpp.service';

describe('SmppController', () => {
  let controller: SmppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmppController],
      providers: [SmppService],
    }).compile();

    controller = module.get<SmppController>(SmppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
