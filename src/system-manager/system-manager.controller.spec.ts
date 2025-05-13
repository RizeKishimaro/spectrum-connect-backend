import { Test, TestingModule } from '@nestjs/testing';
import { SystemManagerController } from './system-manager.controller';
import { SystemManagerService } from './system-manager.service';

describe('SystemManagerController', () => {
  let controller: SystemManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemManagerController],
      providers: [SystemManagerService],
    }).compile();

    controller = module.get<SystemManagerController>(SystemManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
