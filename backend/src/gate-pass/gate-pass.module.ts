import { Module } from '@nestjs/common';
import { GatePassController } from './gate-pass.controller';
import { GatePassService } from './gate-pass.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({ imports: [PrismaModule, InventoryModule], controllers: [GatePassController], providers: [GatePassService] })
export class GatePassModule {}