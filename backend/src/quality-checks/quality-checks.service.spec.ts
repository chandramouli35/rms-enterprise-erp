import { Test, TestingModule } from '@nestjs/testing';
import { QualityChecksService } from './quality-checks.service';

describe('QualityChecksService', () => {
  let service: QualityChecksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QualityChecksService],
    }).compile();

    service = module.get<QualityChecksService>(QualityChecksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
