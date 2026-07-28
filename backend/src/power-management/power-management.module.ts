import { Module } from '@nestjs/common';
import { PowerManagementService } from './power-management.service';
import { PowerManagementController } from './power-management.controller';

@Module({
  providers: [PowerManagementService],
  controllers: [PowerManagementController]
})
export class PowerManagementModule {}
