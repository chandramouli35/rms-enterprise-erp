import { Module } from '@nestjs/common';
import { DryerWorkController } from './dryer-work.controller';
import { DryerWorkService } from './dryer-work.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DryerWorkController],
  providers: [DryerWorkService, PrismaService],
})
export class DryerWorkModule {}
