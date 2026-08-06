import { Test, TestingModule } from '@nestjs/testing';
import { IntermillController } from './intermill.controller';

describe('IntermillController', () => {
  let controller: IntermillController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntermillController],
    }).compile();

    controller = module.get<IntermillController>(IntermillController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
