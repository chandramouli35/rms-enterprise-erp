import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('plants')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  async findAll() {
    return this.plantsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: any) {
    // In a real app we'd restrict this to SUPER_ADMIN only
    return this.plantsService.create(data);
  }
}
