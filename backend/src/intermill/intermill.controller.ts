import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { IntermillService } from './intermill.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/production/intermill')
export class IntermillController {
  constructor(private readonly intermillService: IntermillService) {}

  @Post()
  create(@Request() req, @Body() createIntermillDto: any) {
    const user = req.user;
    return this.intermillService.create(createIntermillDto, user);
  }

  @Get()
  findAll(@Request() req) {
    const user = req.user;
    return this.intermillService.findAll(user);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.intermillService.approve(id, user);
  }
}
