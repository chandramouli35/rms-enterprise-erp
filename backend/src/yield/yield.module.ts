import { Module } from '@nestjs/common';
import { YieldService } from './yield.service';
import { YieldController } from './yield.controller';
import { YieldCronService } from './yield-cron.service';

@Module({
  providers: [YieldService, YieldCronService],
  controllers: [YieldController],
  exports: [YieldService],
})
export class YieldModule {}
