import { Test, TestingModule } from '@nestjs/testing';
import { DispatchFinanceService } from './dispatch-finance.service';

describe('DispatchFinanceService', () => {
  let service: DispatchFinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DispatchFinanceService],
    }).compile();

    service = module.get<DispatchFinanceService>(DispatchFinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
