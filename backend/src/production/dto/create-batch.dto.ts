import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  plantId: string;

  @IsString()
  batchNo: string;

  @IsDateString()
  date: string;

  @IsString()
  shift: string;

  @IsString()
  productionLine: string;

  @IsString()
  paddyType: string;

  @IsString()
  variety: string;

  @IsOptional()
  @IsString()
  paddySource?: string;

  @IsNumber()
  paddyUsedQty: number;

  @IsOptional()
  @IsNumber()
  moisture?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  additionalOutputs?: Record<string, { produced: number; reused: number; wandProduced?: number }>;
}
