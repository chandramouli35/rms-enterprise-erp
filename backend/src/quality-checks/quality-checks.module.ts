import { Module } from '@nestjs/common';
import { QualityChecksController } from './quality-checks.controller';
import { QualityChecksService } from './quality-checks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QualityChecksController],
  providers: [QualityChecksService]
})
export class QualityChecksModule {}
