import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) {
      throw new UnauthorizedException('Plant context missing');
    }
    return this.dashboardService.getSummary(plantId);
  }
}
