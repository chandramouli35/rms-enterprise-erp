import { Test, TestingModule } from '@nestjs/testing';
import { WeighbridgeService } from './weighbridge.service';

describe('WeighbridgeService', () => {
  let service: WeighbridgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeighbridgeService],
    }).compile();

    service = module.get<WeighbridgeService>(WeighbridgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
