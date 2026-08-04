import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('global/:key')
  getGlobalSetting(@Param('key') key: string) {
    return this.settingsService.getGlobalSetting(key);
  }

  @Post('global')
  updateGlobalSetting(@Body() data: { key: string; value: string }) {
    return this.settingsService.updateGlobalSetting(data.key, data.value);
  }
}
