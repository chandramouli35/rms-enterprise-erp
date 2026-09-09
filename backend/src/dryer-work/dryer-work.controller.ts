import { Controller, Post, Get, Body, Headers, Query, UseGuards } from '@nestjs/common';
import { DryerWorkService } from './dryer-work.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@Controller('api/dryer-work')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DryerWorkController {
  constructor(private readonly dryerWorkService: DryerWorkService) {}

  private extractPlantId(headers: any): string {
    const plantId = headers['x-plant-id'];
    if (!plantId) {
      throw new Error('x-plant-id header is required');
    }
    return plantId;
  }

  @Post('goyal-agro')
  @RequirePermission('Dryer Work', 'canAdd')
  async createGoyalAgroLog(@Headers() headers, @Body() data: any) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.createGoyalAgroLog(plantId, data);
  }

  @Get('goyal-agro')
  @RequirePermission('Dryer Work', 'canView')
  async getGoyalAgroLogs(@Headers() headers, @Query('date') date?: string) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.getGoyalAgroLogs(plantId, date);
  }

  @Post('rajoa-agro')
  @RequirePermission('Dryer Work', 'canAdd')
  async createRajoaAgroLog(@Headers() headers, @Body() data: any) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.createRajoaAgroLog(plantId, data);
  }

  @Get('rajoa-agro')
  @RequirePermission('Dryer Work', 'canView')
  async getRajoaAgroLogs(@Headers() headers, @Query('date') date?: string) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.getRajoaAgroLogs(plantId, date);
  }

  @Post('beas-agro')
  @RequirePermission('Dryer Work', 'canAdd')
  async createBeasAgroLog(@Headers() headers, @Body() data: any) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.createBeasAgroLog(plantId, data);
  }

  @Get('beas-agro')
  @RequirePermission('Dryer Work', 'canView')
  async getBeasAgroLogs(@Headers() headers, @Query('date') date?: string) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.getBeasAgroLogs(plantId, date);
  }
}
