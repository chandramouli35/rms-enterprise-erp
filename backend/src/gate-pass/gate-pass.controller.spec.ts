import { Test, TestingModule } from '@nestjs/testing';
import { GatePassController } from './gate-pass.controller';

describe('GatePassController', () => {
  let controller: GatePassController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatePassController],
    }).compile();

    controller = module.get<GatePassController>(GatePassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
