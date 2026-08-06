import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('plants')
//@UseGuards(JwtAuthGuard)
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.plantsService.findAll(page, limit);
  }

  @Post()
  async create(@Body() data: any) {
    // In a real app we'd restrict this to SUPER_ADMIN only
    return this.plantsService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.plantsService.update(id, data);
  }
}
