import { Controller, Post, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { QualityChecksService } from './quality-checks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@Controller('quality-checks')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class QualityChecksController {
  constructor(private readonly qualityChecksService: QualityChecksService) {}

  private getPlantId(req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) throw new UnauthorizedException('Plant context missing');
    return plantId;
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    return this.qualityChecksService.create(this.getPlantId(req), req.user.id, data);
  }
}
