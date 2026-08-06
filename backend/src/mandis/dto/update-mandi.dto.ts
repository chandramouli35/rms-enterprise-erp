import { PartialType } from '@nestjs/mapped-types';
import { CreateMandiDto } from './create-mandi.dto';

export class UpdateMandiDto extends PartialType(CreateMandiDto) {}
