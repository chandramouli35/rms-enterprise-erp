import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto, UpdateTransferStatusDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PlantContextGuard, PermissionsGuard)
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get('metrics')
  @RequirePermission('Transfer', 'canView')
  getMetrics(@Query('plantId') plantId: string) {
    return this.transferService.getMetrics(plantId);
  }

  @Get()
  @RequirePermission('Transfer', 'canView')
  getAllTransfers(
    @Query('plantId') plantId: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.transferService.getAllTransfers(plantId, status, dateFrom, dateTo, page, limit);
  }

  @Post()
  @RequirePermission('Transfer', 'canAdd')
  createTransfer(@Body() createTransferDto: CreateTransferDto) {
    return this.transferService.createTransfer(createTransferDto);
  }

  @Patch(':id/status')
  @RequirePermission('Transfer', 'canEdit')
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateTransferStatusDto) {
    return this.transferService.updateStatus(id, updateStatusDto);
  }
}

