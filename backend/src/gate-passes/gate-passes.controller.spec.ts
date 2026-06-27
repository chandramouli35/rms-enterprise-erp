import { Test, TestingModule } from '@nestjs/testing';
import { GatePassesController } from './gate-passes.controller';

describe('GatePassesController', () => {
  let controller: GatePassesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatePassesController],
    }).compile();

    controller = module.get<GatePassesController>(GatePassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
