import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PlantContextGuard, PermissionsGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('metrics')
  @RequirePermission('Production', 'canView')
  getMetrics(@Query('plantId') plantId: string) {
    return this.productionService.getMetrics(plantId);
  }

  @Get('batches')
  @RequirePermission('Production', 'canView')
  getBatches(@Query('plantId') plantId: string) {
    return this.productionService.getBatches(plantId);
  }

  @Post('batches')
  @RequirePermission('Production', 'canAdd')
  createBatch(@Body() createBatchDto: CreateBatchDto) {
    return this.productionService.createBatch(createBatchDto);
  }
}

