import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('plants')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.plantsService.findAll(pageNum, limitNum, search);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: any) {
    // In a real app we'd restrict this to SUPER_ADMIN only
    return this.plantsService.create(data);
  }
}
