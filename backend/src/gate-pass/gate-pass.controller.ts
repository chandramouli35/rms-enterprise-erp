import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GatePassService } from './gate-pass.service';

@Controller('api/gate-pass')
export class GatePassController {
  constructor(private readonly gatePassService: GatePassService) {}

  @Post('generate')
  generateGatePass(@Body() data: any) {
    return this.gatePassService.generateGatePass(data);
  }

  @Get('campus-status/:plantId')
  getCampusStatus(@Param('plantId') plantId: string) {
    return this.gatePassService.getCampusStatus(plantId);
  }
}