import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IntermillService } from './intermill.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/production/intermill')
export class IntermillController {
  constructor(private readonly intermillService: IntermillService) {}

  @Post()
  @RequirePermission('Production', 'canAdd')
  create(@Request() req, @Body() createIntermillDto: any) {
    const user = req.user;
    return this.intermillService.create(createIntermillDto, user);
  }

  @Get()
  @RequirePermission('Production', 'canView')
  findAll(@Request() req) {
    const user = req.user;
    return this.intermillService.findAll(user);
  }

  @Post(':id/approve')
  @RequirePermission('Production', 'canEdit')
  approve(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.intermillService.approve(id, user);
  }
}
