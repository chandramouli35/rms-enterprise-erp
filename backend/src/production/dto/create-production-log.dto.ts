import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProductionLogDto {
  @IsString()
  @IsNotEmpty()
  itemType: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
  shift?: string;
}
