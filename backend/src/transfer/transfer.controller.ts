import { Controller, Get, Post, Body, Query, UseGuards, Patch, Param } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto, UpdateTransferStatusDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@UseGuards(JwtAuthGuard, PlantContextGuard)
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get('metrics')
  getMetrics(@Query('plantId') plantId: string) {
    return this.transferService.getMetrics(plantId);
  }

  @Get()
  getAllTransfers(@Query('plantId') plantId: string) {
    return this.transferService.getAllTransfers(plantId);
  }

  @Post()
  createTransfer(@Body() createTransferDto: CreateTransferDto) {
    return this.transferService.createTransfer(createTransferDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateTransferStatusDto) {
    return this.transferService.updateStatus(id, updateStatusDto);
  }
}
