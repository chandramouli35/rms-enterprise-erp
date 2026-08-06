import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { MandisService } from './mandis.service';
import { CreateMandiDto } from './dto/create-mandi.dto';
import { UpdateMandiDto } from './dto/update-mandi.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/mandis')
export class MandisController {
  constructor(private readonly mandisService: MandisService) {}

  @Post()
  create(@Body() createMandiDto: CreateMandiDto) {
    return this.mandisService.create(createMandiDto);
  }

  @Get()
  findAll() {
    return this.mandisService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mandisService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateMandiDto: UpdateMandiDto) {
    return this.mandisService.update(id, updateMandiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mandisService.remove(id);
  }
}
