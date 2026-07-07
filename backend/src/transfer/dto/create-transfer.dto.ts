import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  fromPlantId: string;

  @IsString()
  toPlantId: string;

  @IsDateString()
  date: string;

  @IsString()
  item: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @IsOptional()
  @IsDateString()
  expectedDelivery?: string;

  @IsOptional()
  @IsString()
  vehicleNo?: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateTransferStatusDto {
  @IsString()
  status: string; // Approved, Dispatched, In Transit, Delivered, Cancelled
}
