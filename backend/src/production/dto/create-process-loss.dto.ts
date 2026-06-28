import { IsString, IsNumber, IsNotEmpty, IsEnum } from 'class-validator';
import { LossType } from '@prisma/client';

export class CreateProcessLossDto {
  @IsEnum(LossType)
  @IsNotEmpty()
  lossType: LossType;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
