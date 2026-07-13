import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class GetInventoryFilterDto {
  @IsOptional()
  @IsString()
  itemType?: string; // PADDY, RICE, BRAN, HUSK, CONSUMABLES, etc.
  
  @IsOptional()
  @IsString()
  godown?: string;
}

export class GetStockReportDto {
  @IsOptional()
  @IsDateString()
  date?: string; // Target date for the stock report, defaults to today
}
