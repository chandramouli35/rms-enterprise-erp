import { Controller, Get, Put, Body, Post, Headers, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { PowerManagementService } from './power-management.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/** Milestone 4 — JWT only until Power is added to Permissions MODULE_STRUCTURE. */
@UseGuards(JwtAuthGuard)
@Controller('power-management')
export class PowerManagementController {
  constructor(private readonly powerManagementService: PowerManagementService) {}

  private getPlantId(headers: any): string {
    const plantId = headers['x-plant-id'];
    if (!plantId) {
      throw new HttpException('Plant ID is required', HttpStatus.BAD_REQUEST);
    }
    return plantId;
  }

  @Get('dashboard')
  getDashboard(@Headers() headers: any) {
    return this.powerManagementService.getDashboard(this.getPlantId(headers));
  }

  @Get('sources')
  getSources(@Headers() headers: any) {
    return this.powerManagementService.getSources(this.getPlantId(headers));
  }

  @Get('trend')
  getTrend(@Headers() headers: any) {
    return this.powerManagementService.getTrend(this.getPlantId(headers));
  }

  @Get('load')
  getLoadDistribution(@Headers() headers: any) {
    return this.powerManagementService.getLoadDistribution(this.getPlantId(headers));
  }

  @Get('alerts')
  getAlerts(@Headers() headers: any) {
    return this.powerManagementService.getAlerts(this.getPlantId(headers));
  }

  @Get('settings')
  getSettings(@Headers() headers: any) {
    return this.powerManagementService.getSettings(this.getPlantId(headers));
  }

  @Put('settings')
  updateSettings(@Headers() headers: any, @Body() data: any) {
    return this.powerManagementService.updateSettings(this.getPlantId(headers), data);
  }

  @Post('seed')
  seedData(@Headers() headers: any) {
    return this.powerManagementService.seedMockData(this.getPlantId(headers));
  }
}
