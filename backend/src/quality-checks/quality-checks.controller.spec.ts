import { Test, TestingModule } from '@nestjs/testing';
import { QualityChecksController } from './quality-checks.controller';

describe('QualityChecksController', () => {
  let controller: QualityChecksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QualityChecksController],
    }).compile();

    controller = module.get<QualityChecksController>(QualityChecksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
