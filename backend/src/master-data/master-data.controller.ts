import { Controller, Get, Post, Put, Delete, Body, Param, Headers, BadRequestException, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MasterDataService } from './master-data.service';

@Controller('api/master-data')
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
  async getTrucks(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getTrucks(plantId, page, limit);
  }

  @Get('trucks/all')
  async getAllTrucks(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getAllTrucks(plantId, page, limit);
  }

  @Post('trucks')
  @UseInterceptors(FileInterceptor('image'))
  async createTruck(
    @Headers() headers, 
    @Body() data: { truckNumber: string, capacity?: number, isApproved?: boolean },
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('Image upload is required for trucks');
    }
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createTruck(plantId, data, file);
  }

  @Put('trucks/:id/approve')
  async approveTruck(@Param('id') id: string) {
    return this.masterDataService.approveTruck(id);
  }

  @Put('trucks/:id/reject')
  async rejectTruck(@Param('id') id: string) {
    return this.masterDataService.rejectTruck(id);
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

  // ===================== LABOUR MASTER =====================
  @Get('labour')
  async getLabour(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getLabour(plantId, page, limit);
  }

  @Post('labour')
  async createLabour(@Headers() headers, @Body() data: { name: string, type?: string, contact?: string }) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createLabour(plantId, data);
  }

  @Delete('labour/:id')
  async deleteLabour(@Param('id') id: string) {
    return this.masterDataService.deleteLabour(id);
  }
}
