import { UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/require-permission.decorator';
import { Controller, Get, Post, Put, Delete, Body, Param, Headers, BadRequestException, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MasterDataService } from './master-data.service';

/** Truck/driver lookups used from Procurement, Gate Pass, and Staff screens. */
const FLEET_LOOKUP = ['Staff Management', 'Procurement', 'Gate Pass', 'Weighbridge'];
const FLEET_MUTATE = ['Staff Management', 'Procurement', 'Gate Pass'];

@Controller('api/master-data')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @RequireAnyPermission(FLEET_LOOKUP, 'canView')
  async getTrucks(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getTrucks(plantId, page, limit);
  }

  @Get('trucks/all')
  @RequireAnyPermission(FLEET_LOOKUP, 'canView')
  async getAllTrucks(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getAllTrucks(plantId, page, limit);
  }

  @Get('trucks/check')
  @RequireAnyPermission(FLEET_LOOKUP, 'canView')
  async checkTruckExists(@Headers() headers, @Query('truckNumber') truckNumber?: string) {
    this.extractPlantId(headers);
    return this.masterDataService.checkTruckExists(truckNumber || '');
  }

  @Post('trucks')
  @RequireAnyPermission(FLEET_MUTATE, 'canAdd')
  @UseInterceptors(FileInterceptor('image'))
  async createTruck(
    @Headers() headers,
    @Body() data: {
      truckNumber: string;
      capacity?: number;
      isApproved?: boolean;
      transportCategory?: string;
      biometricData?: string;
      vehicleType?: string;
      readingUnit?: string;
    },
    @Req() req,
    @UploadedFile() file?: Express.Multer.File
  ) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createTruck(plantId, data, file, req.user);
  }

  @Put('trucks/:id/approve')
  @RequirePermission('Staff Management', 'canEdit')
  async approveTruck(@Param('id') id: string, @Req() req) {
    return this.masterDataService.approveTruck(id, req.user?.id);
  }

  @Put('trucks/:id/reject')
  @RequirePermission('Staff Management', 'canEdit')
  async rejectTruck(@Param('id') id: string, @Req() req) {
    return this.masterDataService.rejectTruck(id, req.user?.id);
  }

  @Delete('trucks/:id')
  @RequirePermission('Staff Management', 'canDelete')
  async deleteTruck(@Param('id') id: string) {
    return this.masterDataService.deleteTruck(id);
  }

  // ===================== DRIVERS =====================
  @Get('drivers')
  @RequireAnyPermission(FLEET_LOOKUP, 'canView')
  async getDrivers() {
    return this.masterDataService.getDrivers();
  }

  @Post('drivers')
  @RequireAnyPermission(FLEET_MUTATE, 'canAdd')
  async createDriver(@Headers() headers, @Body() data: { name: string, licenseNo?: string, phone?: string }, @Req() req) {
    let plantId = headers['x-plant-id'];
    if (!plantId || plantId === 'undefined' || plantId === 'null') {
      const firstPlant = await this.masterDataService.getFirstPlant();
      if (!firstPlant) throw new BadRequestException('No plant exists to associate with the global driver');
      plantId = firstPlant.id;
    }
    return this.masterDataService.createDriver(plantId, data, req.user?.id);
  }

  @Delete('drivers/:id')
  @RequirePermission('Staff Management', 'canDelete')
  async deleteDriver(@Param('id') id: string) {
    return this.masterDataService.deleteDriver(id);
  }

  @Put('drivers/:id')
  @RequirePermission('Staff Management', 'canEdit')
  async updateDriver(@Param('id') id: string, @Body() data: any) {
    return this.masterDataService.updateDriver(id, data);
  }

  // ===================== STAFF =====================
  @Get('staff')
  @RequireAnyPermission(['Staff Management', 'Procurement'], 'canView')
  async getStaff(@Headers() headers) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getStaff(plantId);
  }

  @Post('staff')
  @RequirePermission('Staff Management', 'canAdd')
  async createStaff(
    @Headers() headers,
    @Body()
    data: {
      name: string;
      role: string;
      phone?: string;
      fingerprint1?: string;
      fingerprint2?: string;
    },
    @Req() req,
  ) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createStaff(plantId, data, req.user?.id);
  }

  @Delete('staff/:id')
  @RequirePermission('Staff Management', 'canDelete')
  async deleteStaff(@Param('id') id: string) {
    return this.masterDataService.deleteStaff(id);
  }

  // ===================== LABOUR MASTER =====================
  @Get('labour')
  @RequireAnyPermission(['Procurement', 'Staff Management', 'Gate Pass'], 'canView')
  async getLabour(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getLabour(plantId, page, limit);
  }

  @Post('labour')
  @RequireAnyPermission(['Procurement', 'Staff Management'], 'canAdd')
  async createLabour(@Headers() headers, @Body() data: { name: string, type?: string, contact?: string, firmName?: string }, @Req() req) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createLabour(plantId, data, req.user?.id);
  }

  @Delete('labour/:id')
  @RequirePermission('Staff Management', 'canDelete')
  async deleteLabour(@Param('id') id: string) {
    return this.masterDataService.deleteLabour(id);
  }

  // ===================== PAHUNCH MASTER =====================
  @Get('pahunch')
  @RequireAnyPermission(['Procurement', 'Staff Management'], 'canView')
  async getPahunch(@Headers() headers, @Query('page') page?: string, @Query('limit') limit?: string) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.getPahunch(plantId, page, limit);
  }

  @Post('pahunch')
  @RequireAnyPermission(['Procurement', 'Staff Management'], 'canAdd')
  async createPahunch(@Headers() headers, @Body() data: { name: string, contact?: string }, @Req() req) {
    const plantId = this.extractPlantId(headers);
    return this.masterDataService.createPahunch(plantId, data, req.user?.id);
  }

  @Delete('pahunch/:id')
  @RequirePermission('Staff Management', 'canDelete')
  async deletePahunch(@Param('id') id: string) {
    return this.masterDataService.deletePahunch(id);
  }
}
