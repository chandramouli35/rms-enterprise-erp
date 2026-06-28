import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsString()
  @IsNotEmpty()
  plantId: string;

  @IsNumber()
  @IsNotEmpty()
  rawMaterialQty: number;
}
