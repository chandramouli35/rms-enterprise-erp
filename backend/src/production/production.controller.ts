import { Controller, Get, Post, Body, Query, UseGuards, Param, Req } from '@nestjs/common';
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
  getBatches(
    @Req() req: any,
    @Query('plantId') plantId: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.productionService.getBatches(plantId, status, dateFrom, dateTo, req.user?.role);
  }

  @Get('batches/:id')
  @RequirePermission('Production', 'canView')
  getBatchDetails(@Param('id') id: string) {
    return this.productionService.getBatchDetails(id);
  }

  @Post('batches')
  @RequirePermission('Production', 'canAdd')
  createBatch(@Body() createBatchDto: CreateBatchDto) {
    return this.productionService.createBatch(createBatchDto);
  }

  @Post('batches/:id/complete')
  @RequirePermission('Production', 'canEdit')
  completeBatch(@Body() data: any, @Query('id') id: string) {
    return this.productionService.completeBatch(id, data);
  }
}

