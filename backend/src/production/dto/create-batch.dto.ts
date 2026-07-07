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
  @IsString()
  remarks?: string;
}
