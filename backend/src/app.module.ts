import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PlantsModule } from './plants/plants.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { UsersRolesModule } from './users-roles/users-roles.module';

@Module({
  imports: [PrismaModule, AuthModule, PlantsModule, DashboardModule, UsersModule, UsersRolesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
