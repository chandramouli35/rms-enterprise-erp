import { Module } from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import { GatePassesController } from './gate-passes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GatePassesController],
  providers: [GatePassesService],
})
export class GatePassesModule {}
