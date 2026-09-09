import { useAuthStore } from '../store/authStore';

const FINANCE = 'Finance';

function permFlag(p: any, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete') {
  if (!p) return false;
  if (p[action] === true || String(p[action]) === 'true') return true;
  const short = action.replace('can', '').toLowerCase(); // view/add/edit/delete
  if (p[short] === true || String(p[short]) === 'true') return true;
  if (p.permissions && (p.permissions[short] === true || p.permissions[action] === true)) return true;
  return false;
}

/** Finance submodule permission check (mirrors DashboardShell hasSubPermission + action). */
export function hasFinancePermission(
  subModuleLabel: string,
  action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' = 'canView',
): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const perms = user.permissions;
  if (!perms || !Array.isArray(perms) || perms.length === 0) {
    // Role fallback used by nav for ACCOUNTANT etc.
    return ['ADMIN', 'PLANT_MANAGER', 'ACCOUNTANT'].includes(user.role || '');
  }
  if (typeof perms[0] === 'string') {
    return perms.some((p) => String(p).toLowerCase() === FINANCE.toLowerCase());
  }

  const sub = subModuleLabel.toLowerCase();
  const subRow = perms.find((p: any) => {
    const mod = (p.moduleName || p.name || '').toLowerCase();
    const s = (p.subModuleName || '').toLowerCase();
    return mod === FINANCE.toLowerCase() && s === sub;
  });
  if (subRow && permFlag(subRow, action)) return true;

  const parent = perms.find((p: any) => {
    const mod = (p.moduleName || p.name || '').toLowerCase();
    return mod === FINANCE.toLowerCase() && (!p.subModuleName || p.subModuleName === '');
  });
  if (parent && permFlag(parent, action)) return true;

  // If submodule rows exist for Finance but neither sub nor parent grants action → deny
  return false;
}

export const FINANCE_TAB_SUBMODULE: Record<string, string> = {
  soda: 'Deals / Soda Record',
  sale: 'Sale',
  purchase: 'Purchase',
  junction: 'Junction Report',
  receivables: 'Receivables',
  payables: 'Payables',
  payment_received: 'Payment Received',
  payment_paid: 'Payment Paid',
};
