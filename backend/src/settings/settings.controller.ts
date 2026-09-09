import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/require-permission.decorator';

@Controller('api/settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Global keys (e.g. govt rate) also read from Procurement settings tab. */
  @Get('global/:key')
  @RequireAnyPermission(['Settings', 'Procurement'], 'canView')
  getGlobalSetting(@Param('key') key: string) {
    return this.settingsService.getGlobalSetting(key);
  }

  @Post('global')
  @RequireAnyPermission(['Settings', 'Procurement'], 'canEdit')
  updateGlobalSetting(@Body() data: { key: string; value: string }) {
    return this.settingsService.updateGlobalSetting(data.key, data.value);
  }
}
