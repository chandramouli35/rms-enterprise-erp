import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@UseGuards(JwtAuthGuard, PlantContextGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get('metrics')
  getMetrics(@Query('plantId') plantId: string) {
    return this.productionService.getMetrics(plantId);
  }

  @Get('batches')
  getBatches(@Query('plantId') plantId: string) {
    return this.productionService.getBatches(plantId);
  }

  @Post('batches')
  createBatch(@Body() createBatchDto: CreateBatchDto) {
    return this.productionService.createBatch(createBatchDto);
  }
}
