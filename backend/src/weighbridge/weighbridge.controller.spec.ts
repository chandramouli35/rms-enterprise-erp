import { Test, TestingModule } from '@nestjs/testing';
import { WeighbridgeController } from './weighbridge.controller';

describe('WeighbridgeController', () => {
  let controller: WeighbridgeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeighbridgeController],
    }).compile();

    controller = module.get<WeighbridgeController>(WeighbridgeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
