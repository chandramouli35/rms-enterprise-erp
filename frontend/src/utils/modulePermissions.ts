import { useAuthStore } from '../store/authStore';

export type PermissionAction = 'canView' | 'canAdd' | 'canEdit' | 'canDelete' | 'canApprove';

const MODULE_ALIASES: Record<string, string[]> = {
  'Yield Mgmt': ['Yield Mgmt', 'Yield'],
  Yield: ['Yield', 'Yield Mgmt'],
  Transfer: ['Transfer', 'Dispatch'],
  Dispatch: ['Dispatch', 'Transfer'],
  'Users and Roles': ['Users and Roles', 'Users', 'User Management'],
  Users: ['Users', 'Users and Roles'],
};

function namesFor(moduleName: string): string[] {
  return (MODULE_ALIASES[moduleName] || [moduleName]).map((n) => n.toLowerCase());
}

function flag(row: any, action: PermissionAction): boolean {
  if (!row) return false;
  if (row[action] === true || String(row[action]) === 'true') return true;
  const short = action.replace(/^can/, '').toLowerCase();
  if (row[short] === true || String(row[short]) === 'true') return true;
  if (row.permissions && (row.permissions[short] === true || row.permissions[action] === true)) return true;
  return false;
}

/**
 * Same rule as the API permission check.
 * Super Admin is allowed. Otherwise the role needs the action on that module,
 * on the named screen, or on the parent row (which covers every screen under it).
 */
export function hasModulePermission(
  moduleName: string,
  action: PermissionAction,
  subModuleName?: string,
): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  const role = String((user as any).role?.name || user.role || '');
  if (role === 'SUPER_ADMIN') return true;

  const perms = user.permissions;
  if (!Array.isArray(perms) || perms.length === 0) return false;
  if (typeof perms[0] === 'string') {
    return perms.some((p) => namesFor(moduleName).includes(String(p).toLowerCase()));
  }

  const accepted = namesFor(moduleName);
  const onMod = (p: any) => accepted.includes(String(p.moduleName || p.name || '').toLowerCase());
  const isParent = (p: any) => !p.subModuleName || p.subModuleName === '';

  const parent = perms.find((p: any) => onMod(p) && isParent(p));
  if (parent && flag(parent, action)) return true;

  if (subModuleName) {
    const wanted = subModuleName.toLowerCase();
    const sub = perms.find(
      (p: any) => onMod(p) && String(p.subModuleName || '').toLowerCase() === wanted,
    );
    return !!(sub && flag(sub, action));
  }

  return perms.some((p: any) => onMod(p) && !isParent(p) && flag(p, action));
}
