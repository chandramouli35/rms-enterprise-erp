import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Query } from '@nestjs/common';
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
  async findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.suppliersService.findAll(this.getPlantId(req), pageNum, limitNum, search);
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
