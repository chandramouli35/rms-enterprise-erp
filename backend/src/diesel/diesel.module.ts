import { Module } from '@nestjs/common';
import { DieselService } from './diesel.service';
import { DieselController } from './diesel.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DieselController],
  providers: [DieselService],
  exports: [DieselService],
})
export class DieselModule {}
