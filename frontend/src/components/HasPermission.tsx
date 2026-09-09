import React from 'react';
import { useAuthStore } from '../store/authStore';

interface HasPermissionProps {
  moduleName: string;
  action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canApprove';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const MODULE_ALIASES: Record<string, string[]> = {
  'Yield Mgmt': ['Yield Mgmt', 'Yield'],
  Yield: ['Yield', 'Yield Mgmt'],
  Transfer: ['Transfer', 'Dispatch'],
  'Users and Roles': ['Users and Roles', 'Users', 'User Management'],
  Users: ['Users', 'Users and Roles'],
};

export const HasPermission: React.FC<HasPermissionProps> = ({ moduleName, action, children, fallback = null }) => {
  const user = useAuthStore((state) => state.user);

  if (!user) return <>{fallback}</>;

  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  const permissions = user.permissions || [];
  const accepted = MODULE_ALIASES[moduleName] || [moduleName];
  const modulePerm = permissions.find((p: any) => {
    const name = p.moduleName || p.name || '';
    const isParent = !p.subModuleName || p.subModuleName === '';
    return isParent && accepted.includes(name);
  });

  if (!modulePerm || !modulePerm[action]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
