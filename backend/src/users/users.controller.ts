import { Controller, Get, Post, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlantContextGuard } from '../common/guards/plant-context.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, PlantContextGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Req() req: any) {
    const plantId = req.headers['x-plant-id'];
    if (!plantId) {
      throw new UnauthorizedException('Plant context missing');
    }
    return this.usersService.findAll(plantId);
  }

  @Post()
  async create(@Body() data: any, @Req() req: any) {
    // In a real app we'd check if req.user has SUPER_ADMIN or PLANT_MANAGER roles here
    // using the @Permissions decorator.
    return this.usersService.create(data, req.user);
  }
}
