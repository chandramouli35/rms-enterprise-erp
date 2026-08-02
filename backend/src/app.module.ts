import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlantsModule } from './plants/plants.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { UsersRolesModule } from './users-roles/users-roles.module';
import { ProcurementModule } from './procurement/procurement.module';
import { WeighbridgeModule } from './weighbridge/weighbridge.module';
import { GatePassModule } from './gate-pass/gate-pass.module';
import { ProductionModule } from './production/production.module';
import { YieldModule } from './yield/yield.module';
import { InventoryModule } from './inventory/inventory.module';
import { TransferModule } from './transfer/transfer.module';
import { ProductsModule } from './products/products.module';
import { DispatchFinanceModule } from './dispatch-finance/dispatch-finance.module';
import { FinanceModule } from './finance/finance.module';
import { PowerManagementModule } from './power-management/power-management.module';
import { MasterDataModule } from './master-data/master-data.module';

@Module({
  imports: [PrismaModule, AuthModule, PlantsModule, DashboardModule, UsersModule, UsersRolesModule, ProcurementModule, WeighbridgeModule, GatePassModule, ProductionModule, YieldModule, InventoryModule, TransferModule, ProductsModule, DispatchFinanceModule, FinanceModule, PowerManagementModule, MasterDataModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
