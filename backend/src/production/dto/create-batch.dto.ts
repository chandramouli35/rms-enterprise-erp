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

  @IsString()
  @IsOptional()
  paddySource?: string;

  @IsString()
  @IsOptional()
  supervisorName?: string;

  @IsString()
  @IsOptional()
  analysisSheetNo?: string;

  @IsNumber()
  paddyUsedQty: number;

  @IsOptional()
  @IsNumber()
  moisture?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  productionType?: string;

  @IsOptional()
  @IsString()
  paddyDryingTargetStack?: string;

  @IsOptional()
  stackInputs?: Array<{ stackNo: string; bags: string | number; isDirectUnload: boolean }>;

  @IsOptional()
  additionalOutputs?: Record<string, { produced: number; reused: number; wandProduced?: number; moisture?: number; targetStack?: string }>;

  @IsOptional()
  @IsString()
  finalOutputBiometricData?: string;
}