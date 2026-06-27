import { Test, TestingModule } from '@nestjs/testing';
import { GatePassesService } from './gate-passes.service';

describe('GatePassesService', () => {
  let service: GatePassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GatePassesService],
    }).compile();

    service = module.get<GatePassesService>(GatePassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
