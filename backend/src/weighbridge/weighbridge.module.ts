import { Module } from '@nestjs/common';
import { WeighbridgeController } from './weighbridge.controller';
import { WeighbridgeService } from './weighbridge.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WeighbridgeController],
  providers: [WeighbridgeService]
})
export class WeighbridgeModule {}
