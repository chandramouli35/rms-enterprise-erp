import { Test, TestingModule } from '@nestjs/testing';
import { IntermillService } from './intermill.service';

describe('IntermillService', () => {
  let service: IntermillService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntermillService],
    }).compile();

    service = module.get<IntermillService>(IntermillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
