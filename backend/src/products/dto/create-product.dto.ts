export class CreateProductDto {
  name: string;
  category?: string;
  description?: string;
  quantityFormat?: string;
}

export class CreateQuantityUnitDto {
  code: string;
  label: string;
  description?: string;
}
