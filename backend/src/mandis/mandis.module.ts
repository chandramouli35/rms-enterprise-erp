import { Module } from '@nestjs/common';
import { MandisService } from './mandis.service';
import { MandisController } from './mandis.controller';

@Module({
  controllers: [MandisController],
  providers: [MandisService],
})
export class MandisModule {}
