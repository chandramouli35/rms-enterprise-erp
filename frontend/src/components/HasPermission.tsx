import React from 'react';
import { useAuthStore } from '../store/authStore';

interface HasPermissionProps {
  moduleName: string;
  action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canApprove';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const HasPermission: React.FC<HasPermissionProps> = ({ moduleName, action, children, fallback = null }) => {
  const user = useAuthStore(state => state.user);

  if (!user) return <>{fallback}</>;

  if (user.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  const permissions = user.permissions || [];
  const modulePerm = permissions.find((p: any) => p.moduleName === moduleName);

  if (!modulePerm || !modulePerm[action]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
