import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skip JWT auth (e.g. weighbridge COM bridge ingest). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
