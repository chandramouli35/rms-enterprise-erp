import React from 'react';
import { useAuthStore } from '../store/authStore';
import { hasModulePermission, type PermissionAction } from '../utils/modulePermissions';

interface HasPermissionProps {
  moduleName: string;
  action: PermissionAction;
  subModuleName?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const HasPermission: React.FC<HasPermissionProps> = ({
  moduleName,
  action,
  subModuleName,
  children,
  fallback = null,
}) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <>{fallback}</>;
  if (!hasModulePermission(moduleName, action, subModuleName)) return <>{fallback}</>;
  return <>{children}</>;
};
