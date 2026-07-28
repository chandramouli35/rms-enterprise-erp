import { Test, TestingModule } from '@nestjs/testing';
import { PowerManagementService } from './power-management.service';

describe('PowerManagementService', () => {
  let service: PowerManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PowerManagementService],
    }).compile();

    service = module.get<PowerManagementService>(PowerManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
