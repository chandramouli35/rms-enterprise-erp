import { Controller, Post, Body, Req, UseGuards, UnauthorizedException, Get } from '@nestjs/common';
import { WeighbridgeService } from './weighbridge.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('weighbridge')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class WeighbridgeController {
  constructor(
    private readonly weighbridgeService: WeighbridgeService,
    private readonly prisma: PrismaService
  ) {}

  private getPlantId(req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) throw new UnauthorizedException('Plant context missing');
    return plantId;
  }

  @Post('capture-weight')
  async captureWeight(@Body() data: any, @Req() req: any) {
    // The user's role is needed for checking override authorization
    // In JwtStrategy, we return the full user, so req.user.role should exist
    // However, if it's an object, we need req.user.role?.name
    const role = req.user.role?.name || req.user.role;
    
    return this.weighbridgeService.captureWeight(this.getPlantId(req), { ...req.user, role }, data);
  }

  @Get('active-queue')
  async getActiveQueue(@Req() req: any) {
    // Returns vehicles waiting for gross or tare weight
    return this.prisma.gatePass.findMany({
      where: {
        plantId: this.getPlantId(req),
        status: { in: ['GENERATED', 'QC_PASSED'] },
        deletedAt: null
      },
      include: {
        supplier: true,
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
