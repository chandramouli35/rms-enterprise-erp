import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateProductionLogDto } from './dto/create-production-log.dto';
import { CreateProcessLossDto } from './dto/create-process-loss.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post('batches')
  createBatch(@Body() dto: CreateBatchDto) {
    return this.productionService.createBatch(dto);
  }

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post('batches/:id/start')
  startMilling(@Param('id') id: string) {
    return this.productionService.startMilling(id);
  }

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post('batches/:id/stop')
  stopMilling(@Param('id') id: string) {
    return this.productionService.stopMilling(id);
  }

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post('milling/:id/log')
  addProductionLog(@Param('id') id: string, @Body() dto: CreateProductionLogDto) {
    return this.productionService.addProductionLog(id, dto);
  }

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post('milling/:id/loss')
  addProcessLoss(@Param('id') id: string, @Body() dto: CreateProcessLossDto) {
    return this.productionService.addProcessLoss(id, dto);
  }

  @Get('batches/:id/yield')
  getBatchYield(@Param('id') id: string) {
    return this.productionService.getBatchYield(id);
  }

  @Get('plants/:plantId/batches')
  findAllBatches(@Param('plantId') plantId: string) {
    return this.productionService.findAllBatches(plantId);
  }

  @Get('plants/:plantId/yield')
  getPlantYieldAnalytics(@Param('plantId') plantId: string) {
    return this.productionService.getPlantYieldAnalytics(plantId);
  }
}
