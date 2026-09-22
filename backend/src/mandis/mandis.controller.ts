import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { MandisService } from './mandis.service';
import { CreateMandiDto } from './dto/create-mandi.dto';
import { UpdateMandiDto } from './dto/update-mandi.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

function assertAdminCanManageMandi(user: any) {
  const role = String(user?.role?.name || user?.role || '');
  if (!/SUPER_ADMIN|PLANT_MANAGER|ADMIN/i.test(role)) {
    throw new ForbiddenException(
      'Only Admin can add or change Mandis. Supervisor cannot create Mandis.',
    );
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/mandis')
export class MandisController {
  constructor(private readonly mandisService: MandisService) {}

  @Post()
  @RequirePermission('Procurement', 'canAdd')
  create(@Body() createMandiDto: CreateMandiDto, @Req() req: any) {
    assertAdminCanManageMandi(req.user);
    return this.mandisService.create(createMandiDto);
  }

  @Get()
  @RequirePermission('Procurement', 'canView')
  findAll() {
    return this.mandisService.findAll();
  }

  @Get(':id')
  @RequirePermission('Procurement', 'canView')
  findOne(@Param('id') id: string) {
    return this.mandisService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('Procurement', 'canEdit')
  update(
    @Param('id') id: string,
    @Body() updateMandiDto: UpdateMandiDto,
    @Req() req: any,
  ) {
    assertAdminCanManageMandi(req.user);
    return this.mandisService.update(id, updateMandiDto);
  }

  @Delete(':id')
  @RequirePermission('Procurement', 'canDelete')
  remove(@Param('id') id: string, @Req() req: any) {
    assertAdminCanManageMandi(req.user);
    return this.mandisService.remove(id);
  }
}
