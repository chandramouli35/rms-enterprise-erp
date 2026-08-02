import { Controller, Get, Post, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PlantContextGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('Users', 'canView')
  async findAll(@Req() req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) {
      throw new UnauthorizedException('Plant context missing');
    }
    return this.usersService.findAll(plantId);
  }

  @Post()
  @RequirePermission('Users', 'canAdd')
  async create(@Body() data: any, @Req() req: any) {
    // In a real app we'd check if req.user has SUPER_ADMIN or PLANT_MANAGER roles here
    // using the @Permissions decorator.
    return this.usersService.create(data, req.user);
  }

  @Post('overrides')
  async grantOverride(@Body() data: { targetUserId: string, permissionType: string }, @Req() req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) {
      throw new UnauthorizedException('Plant context missing');
    }
    // Only Admin can grant overrides
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'PLANT_MANAGER' && req.user.role !== 'ADMIN') {
        throw new UnauthorizedException('Insufficient permissions to grant overrides');
    }
    return this.usersService.grantOverride(plantId, data.targetUserId, data.permissionType, req.user.id);
  }

  @Get('overrides/active')
  async getActiveOverrides(@Req() req: any) {
    const plantId = req.headers['x-plant-id'];
    return this.usersService.getActiveOverrides(plantId, req.user.id);
  }
}

