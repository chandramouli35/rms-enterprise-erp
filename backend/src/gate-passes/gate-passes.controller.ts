import { Controller, Get, Post, Body, Param, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { GatePassesService } from './gate-passes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@Controller('gate-passes')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class GatePassesController {
  constructor(private readonly gatePassesService: GatePassesService) {}

  private getPlantId(req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) throw new UnauthorizedException('Plant context missing');
    return plantId;
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    return this.gatePassesService.create(this.getPlantId(req), req.user.id, data);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.gatePassesService.findAll(this.getPlantId(req));
  }

  @Get('scan/:barcode')
  async scanBarcode(@Param('barcode') barcode: string, @Req() req: any) {
    return this.gatePassesService.scanBarcode(this.getPlantId(req), barcode);
  }
}
