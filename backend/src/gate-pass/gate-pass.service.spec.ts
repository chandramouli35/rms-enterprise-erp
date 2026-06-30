import { Test, TestingModule } from '@nestjs/testing';
import { GatePassService } from './gate-pass.service';

describe('GatePassService', () => {
  let service: GatePassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GatePassService],
    }).compile();

    service = module.get<GatePassService>(GatePassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
