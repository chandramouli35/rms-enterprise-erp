import { Controller, Post, Body } from '@nestjs/common';
import { ProcurementService } from './procurement.service';

@Controller('api/procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post('save-purchase')
  savePurchase(@Body() data: any) {
    return this.procurementService.savePurchase(data);
  }
}