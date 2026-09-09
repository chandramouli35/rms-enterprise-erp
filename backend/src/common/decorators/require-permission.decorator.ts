import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export type PermissionAction = 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canApprove';

/** Single-module permission (exact parent or optional submodule). */
export const RequirePermission = (
  moduleName: string,
  action: PermissionAction,
  subModuleName?: string,
) => SetMetadata(REQUIRE_PERMISSION_KEY, { moduleName, action, subModuleName });

/**
 * Allow if the user has `action` on ANY of the listed modules.
 * Use for shared dropdowns / lookups called from multiple FE tabs.
 */
export const RequireAnyPermission = (moduleNames: string[], action: PermissionAction) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { moduleNames, action, anyOf: true });
