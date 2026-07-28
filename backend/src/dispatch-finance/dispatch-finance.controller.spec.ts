import { Test, TestingModule } from '@nestjs/testing';
import { DispatchFinanceController } from './dispatch-finance.controller';

describe('DispatchFinanceController', () => {
  let controller: DispatchFinanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DispatchFinanceController],
    }).compile();

    controller = module.get<DispatchFinanceController>(DispatchFinanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
