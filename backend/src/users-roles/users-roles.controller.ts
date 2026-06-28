import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersRolesService } from './users-roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users-roles')
export class UsersRolesController {
  constructor(private readonly service: UsersRolesService) {}

  @Get('summary-metrics')
  getStats() {
    return this.service.getStats();
  }

  @Get('list')
  getUsersList() {
    return this.service.getUsersList();
  }

  @Post('create')
  createUser(@Body() body: any) {
    return this.service.createUser(body);
  }

  @Patch('users/:id/status')
  toggleStatus(@Param('id') id: string) {
    return this.service.toggleUserStatus(id);
  }

  @Get('roles')
  getRoles() {
    return this.service.getRoles();
  }

  @Post('roles')
  createRole(@Body() body: any) {
    return this.service.createRole(body);
  }

  @Get('roles/:roleId/permissions')
  getRolePermissions(@Param('roleId') roleId: string) {
    return this.service.getRolePermissions(roleId);
  }

  @Post('roles/:roleId/permissions')
  updateRolePermissions(@Param('roleId') roleId: string, @Body('permissions') permissions: any[]) {
    return this.service.updateRolePermissions(roleId, permissions);
  }

  @Get('audit-summary')
  getAuditLogs() {
    return this.service.getAuditLogs();
  }

  @Get('audit-list')
  getAuditList() {
    return this.service.getAuditList();
  }
}
