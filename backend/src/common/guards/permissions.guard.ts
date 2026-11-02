import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
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

    const handlerName = context.getHandler().name;
    const permissions = user.role?.modulePermissions || [];
    if (
      user.role?.name === 'SUPERVISOR' &&
      ['createTruck', 'getAllTrucks', 'checkTruckExists'].includes(handlerName)
    ) {
      return true;
    }

    // Save is allowed for Add or Edit on Paddy Inward (or the Procurement parent row).
    // View-only roles can open the screen; the Save buttons stay hidden for them.
    if (handlerName === 'savePurchase') {
      const accepted = acceptedNamesFor('Procurement');
      const onProc = (p: any) => accepted.includes(p.moduleName);
      const isParent = (p: any) => !p.subModuleName || p.subModuleName === '';
      const parentRow = permissions.find((p: any) => onProc(p) && isParent(p));
      const paddy = permissions.find(
        (p: any) => onProc(p) && p.subModuleName === 'Paddy Inward',
      );
      const canWrite = (row: any) =>
        !!row && (row.canAdd === true || row.canEdit === true);
      if (canWrite(parentRow) || canWrite(paddy)) return true;
      throw new ForbiddenException(
        'Not allowed to save Paddy Inward. Turn on Add or Edit for Procurement → Paddy Inward on this role, then log in again.',
      );
    }

    const { action, subModuleName, anyOf, moduleName, moduleNames } = required;

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
      } else {
        // Parent-level check: any submodule grant also unlocks shared module endpoints
        const anySub = permissions.some(
          (p: any) =>
            accepted.includes(p.moduleName) &&
            !!p.subModuleName &&
            p[action] === true,
        );
        if (anySub) return true;
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
