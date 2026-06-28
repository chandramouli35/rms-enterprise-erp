import { Controller, Get, Post, Body, Req, UseGuards, UnauthorizedException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('role') role?: string) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) {
      throw new UnauthorizedException('Plant context missing');
    }
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.usersService.findAll(plantId, pageNum, limitNum, search, role);
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    // In a real app we'd check if req.user has SUPER_ADMIN or PLANT_MANAGER roles here
    // using the @Permissions decorator.
    return this.usersService.create(data, req.user);
  }
}
