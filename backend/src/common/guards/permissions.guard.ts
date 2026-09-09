import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

const MODULE_ALIASES: Record<string, string[]> = {
  'Yield Mgmt': ['Yield Mgmt', 'Yield'],
  Yield: ['Yield', 'Yield Mgmt'],
  Transfer: ['Transfer', 'Dispatch'],
  Dispatch: ['Dispatch', 'Transfer'],
  'Users and Roles': ['Users and Roles', 'Users', 'User Management'],
  Users: ['Users', 'Users and Roles'],
};

function acceptedNamesFor(moduleName: string): string[] {
  return MODULE_ALIASES[moduleName] || [moduleName];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<{
      moduleName?: string;
      moduleNames?: string[];
      action: string;
      subModuleName?: string;
      anyOf?: boolean;
    }>(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) {
      return true; // JWT-only endpoints (lookups without decorator stay open to authenticated users when JwtAuthGuard is present)
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (user.role?.name === 'SUPER_ADMIN') return true;

    const { action, subModuleName, anyOf, moduleName, moduleNames } = required;
    const permissions = user.role?.modulePermissions || [];

    const hasAction = (modNames: string[], sub?: string) => {
      const accepted = modNames.flatMap((m) => acceptedNamesFor(m));
      const row = permissions.find(
        (p: any) =>
          accepted.includes(p.moduleName) &&
          (sub ? p.subModuleName === sub : !p.subModuleName || p.subModuleName === ''),
      );
      if (row && row[action] === true) return true;
      // Parent grant covers missing submodule row
      if (sub) {
        const parent = permissions.find(
          (p: any) =>
            accepted.includes(p.moduleName) && (!p.subModuleName || p.subModuleName === ''),
        );
        if (parent && parent[action] === true) return true;
      }
      return false;
    };

    if (anyOf && Array.isArray(moduleNames) && moduleNames.length) {
      return moduleNames.some((m) => hasAction([m]));
    }

    if (!moduleName) return false;
    return hasAction([moduleName], subModuleName);
  }
}
