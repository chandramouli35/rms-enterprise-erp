import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<{ moduleName: string, action: string }>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }

    // SUPER_ADMIN has access to everything
    if (user.role?.name === 'SUPER_ADMIN') {
      return true;
    }

    const { moduleName, action } = requiredPermission;

    // Permissions are injected into the user object via JwtStrategy
    const permissions = user.role?.modulePermissions || [];
    const modulePerm = permissions.find((p: any) => p.moduleName === moduleName);

    if (!modulePerm) {
      return false;
    }

    return modulePerm[action] === true;
  }
}
