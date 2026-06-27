import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  private getPlantId(req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) throw new UnauthorizedException('Plant context missing');
    return plantId;
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.suppliersService.findAll(this.getPlantId(req));
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    return this.suppliersService.create(this.getPlantId(req), data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.suppliersService.update(this.getPlantId(req), id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.suppliersService.remove(this.getPlantId(req), id);
  }
}
