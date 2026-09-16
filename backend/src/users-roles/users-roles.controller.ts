import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { UsersRolesService } from './users-roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users-roles')
export class UsersRolesController {
  constructor(private readonly service: UsersRolesService) {}

  @Get('summary-metrics')
  @RequirePermission('Users and Roles', 'canView')
  getStats() {
    return this.service.getStats();
  }

  @Get('list')
  @RequirePermission('Users and Roles', 'canView')
  async getUsersList(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.getUsersList(page, limit);
  }

  @Get('check-username')
  @RequirePermission('Users and Roles', 'canView')
  checkUsernameExists(@Query('username') username?: string) {
    return this.service.checkUsernameExists(username || '');
  }

  @Post('create')
  @RequirePermission('Users and Roles', 'canAdd')
  createUser(@Body() body: any) {
    return this.service.createUser(body);
  }

  @Patch('users/:id/status')
  @RequirePermission('Users and Roles', 'canEdit')
  toggleStatus(@Param('id') id: string) {
    return this.service.toggleUserStatus(id);
  }

  @Patch('users/:id')
  @RequirePermission('Users and Roles', 'canEdit')
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.service.updateUser(id, body);
  }

  @Delete('users/:id')
  @RequirePermission('Users and Roles', 'canDelete')
  deleteUser(@Param('id') id: string) {
    return this.service.deleteUser(id);
  }

  @Post('users/:id/transfer')
  @RequirePermission('Users and Roles', 'canAdd')
  transferUser(@Param('id') id: string, @Body() body: any) {
    return this.service.transferUser(id, body);
  }

  @Get('roles')
  @RequirePermission('Users and Roles', 'canView')
  getRoles() {
    return this.service.getRoles();
  }

  @Get('check-role')
  @RequirePermission('Users and Roles', 'canView')
  checkRoleExists(@Query('name') name?: string) {
    return this.service.checkRoleExists(name || '');
  }

  @Post('roles')
  @RequirePermission('Users and Roles', 'canAdd')
  createRole(@Body() body: any) {
    return this.service.createRole(body);
  }

  @Get('roles/:roleId/permissions')
  @RequirePermission('Users and Roles', 'canView')
  getRolePermissions(@Param('roleId') roleId: string) {
    return this.service.getRolePermissions(roleId);
  }

  @Post('roles/:roleId/permissions')
  @RequirePermission('Users and Roles', 'canEdit')
  updateRolePermissions(@Param('roleId') roleId: string, @Body('permissions') permissions: any[]) {
    return this.service.updateRolePermissions(roleId, permissions);
  }

  @Get('audit-summary')
  @RequirePermission('Users and Roles', 'canView')
  getAuditLogs() {
    return this.service.getAuditLogs();
  }

  @Get('audit-list')
  @RequirePermission('Users and Roles', 'canView')
  getAuditList() {
    return this.service.getAuditList();
  }
}

