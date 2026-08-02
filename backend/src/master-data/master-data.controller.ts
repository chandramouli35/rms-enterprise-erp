import { Controller, Get, Post, Delete, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { MasterDataService } from './master-data.service';

@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  private extractPlantId(headers: any): string {
    const plantId = headers['x-plant-id'];
    if (!plantId) {
      throw new BadRequestException('Plant ID is required');
    }
    return plantId;
  }

  // ===================== TRUCKS =====================
  @Get('trucks')
  async getTrucks(@Headers() headers) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getTrucks(plantId);
  }

  @Post('trucks')
  async createTruck(@Headers() headers, @Body() data: { truckNumber: string, capacity?: number }) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createTruck(plantId, data);
  }

  @Delete('trucks/:id')
  async deleteTruck(@Param('id') id: string) {
    return this.masterDataService.deleteTruck(id);
  }

  // ===================== DRIVERS =====================
  @Get('drivers')
  async getDrivers(@Headers() headers) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getDrivers(plantId);
  }

  @Post('drivers')
  async createDriver(@Headers() headers, @Body() data: { name: string, licenseNo?: string, phone?: string }) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createDriver(plantId, data);
  }

  @Delete('drivers/:id')
  async deleteDriver(@Param('id') id: string) {
    return this.masterDataService.deleteDriver(id);
  }

  // ===================== STAFF =====================
  @Get('staff')
  async getStaff(@Headers() headers) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getStaff(plantId);
  }

  @Post('staff')
  async createStaff(@Headers() headers, @Body() data: { name: string, role: string, phone?: string }) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createStaff(plantId, data);
  }

  @Delete('staff/:id')
  async deleteStaff(@Param('id') id: string) {
    return this.masterDataService.deleteStaff(id);
  }
}
