import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { CmsControlsService } from './cms-controls.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersRolesModule } from '../users-roles/users-roles.module';

@Module({
  imports: [PrismaModule, UsersRolesModule],
  controllers: [CmsController],
  providers: [CmsService, CmsControlsService],
})
export class CmsModule {}
