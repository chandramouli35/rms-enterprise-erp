import { Controller, Post, Body, Param, Get, UseGuards, Request } from '@nestjs/common';
import { TransfersService, CreateTransferDto } from './transfers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ItemCategory } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post('initiate')
  initiateTransfer(@Body() dto: CreateTransferDto, @Request() req) {
    return this.transfersService.initiateTransfer(dto, req.user.userId);
  }

  @Roles('SUPER_ADMIN', 'PLANT_MANAGER')
  @Post(':id/receive')
  receiveTransfer(
    @Param('id') id: string, 
    @Body('itemCategory') itemCategory: ItemCategory, 
    @Request() req
  ) {
    return this.transfersService.receiveTransfer(id, req.user.userId, itemCategory);
  }

  @Get('plants/:plantId')
  getTransfersForPlant(@Param('plantId') plantId: string) {
    return this.transfersService.getTransfersForPlant(plantId);
  }
}
