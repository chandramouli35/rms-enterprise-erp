import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';
export const RequirePermission = (moduleName: string, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canApprove', subModuleName?: string) => 
  SetMetadata(REQUIRE_PERMISSION_KEY, { moduleName, action, subModuleName });
