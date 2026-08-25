import { Controller, Post, Get, Body, Headers, Query } from '@nestjs/common';
import { DryerWorkService } from './dryer-work.service';

@Controller('api/dryer-work')
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
  async createGoyalAgroLog(@Headers() headers, @Body() data: any) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.createGoyalAgroLog(plantId, data);
  }

  @Get('goyal-agro')
  async getGoyalAgroLogs(@Headers() headers, @Query('date') date?: string) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.getGoyalAgroLogs(plantId, date);
  }

  @Post('rajoa-agro')
  async createRajoaAgroLog(@Headers() headers, @Body() data: any) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.createRajoaAgroLog(plantId, data);
  }

  @Get('rajoa-agro')
  async getRajoaAgroLogs(@Headers() headers, @Query('date') date?: string) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.getRajoaAgroLogs(plantId, date);
  }

  // --- BEAS AGRO ---
  @Post('beas-agro')
  async createBeasAgroLog(@Headers() headers, @Body() data: any) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.createBeasAgroLog(plantId, data);
  }

  @Get('beas-agro')
  async getBeasAgroLogs(@Headers() headers, @Query('date') date?: string) {
    const plantId = this.extractPlantId(headers);
    return this.dryerWorkService.getBeasAgroLogs(plantId, date);
  }
}
