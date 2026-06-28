import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlantsModule } from './plants/plants.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { GatePassesModule } from './gate-passes/gate-passes.module';
import { QualityChecksModule } from './quality-checks/quality-checks.module';
import { WeighbridgeModule } from './weighbridge/weighbridge.module';
import { ProductionModule } from './production/production.module';
import { InventoryModule } from './inventory/inventory.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [PrismaModule, AuthModule, PlantsModule, DashboardModule, UsersModule, SuppliersModule, GatePassesModule, QualityChecksModule, WeighbridgeModule, ProductionModule, InventoryModule, TransfersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
