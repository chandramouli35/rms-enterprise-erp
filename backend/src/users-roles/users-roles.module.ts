import { Module } from '@nestjs/common';
import { UsersRolesController } from './users-roles.controller';
import { UsersRolesService } from './users-roles.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersRolesController],
  providers: [UsersRolesService],
  exports: [UsersRolesService],
})
export class UsersRolesModule {}
