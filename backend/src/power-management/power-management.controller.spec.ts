import { Test, TestingModule } from '@nestjs/testing';
import { PowerManagementController } from './power-management.controller';

describe('PowerManagementController', () => {
  let controller: PowerManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PowerManagementController],
    }).compile();

    controller = module.get<PowerManagementController>(PowerManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
