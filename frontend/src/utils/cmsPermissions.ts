import { useAuthStore } from '../store/authStore';

const CMS = 'CMS';

/** Exact client checklist labels — must match MODULE_STRUCTURE CMS subModules */
export const CMS_TAB_SUBMODULE: Record<string, string> = {
  paddy_inward: 'Real-time Paddy Inward (Notified)',
  boli_record: 'Boli Record with Pending Boli Also',
  gp_tracking: 'Real-time GP Entry Tracking (Notified)',
  paddy_stock: 'Paddy Stock',
  production: 'Production Tracking',
  stock_ledger: 'Live Stock Ledger',
  yield: 'Yield Analysis',
  alerts: 'Alerts on Abnormal Transactions',
  basis_tracking: 'Real-time Basis Tracking',
  user_rights: 'CMS User Permission Controls',
  traceability: 'Full Traceability',
  plant_compare: 'Plant-Wise Comparison',
  manual_corrections: 'Manual Correction Alerts',
  overprice: 'Overprice Detection',
  weighment_patterns: 'Weighment Pattern Monitoring',
  correction_audit: 'Correction Audit Control',
  audit_logs: 'Audit Logs Tracking',
  severity: 'Transaction Severity Categories',
  stock_dispatch: 'Stock Available for Dispatch',
  receivables: 'Receivables Tracking',
  paddy_cost: 'Paddy Cost Tracking',
};

export const CMS_TABS: { id: string; label: string }[] = Object.entries(
  CMS_TAB_SUBMODULE,
).map(([id, label]) => ({ id, label }));

function permFlag(p: any, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete') {
  if (!p) return false;
  if (p[action] === true || String(p[action]) === 'true') return true;
  const short = action.replace('can', '').toLowerCase();
  if (p[short] === true || String(p[short]) === 'true') return true;
  return false;
}

const SUB_ALIASES: Record<string, string[]> = {
  'Real-time Paddy Inward (Notified)': [
    'Real-time Paddy Inward (Notified)',
    'Paddy Inward',
  ],
  'Boli Record with Pending Boli Also': [
    'Boli Record with Pending Boli Also',
    'Boli Record',
  ],
  'Real-time GP Entry Tracking (Notified)': [
    'Real-time GP Entry Tracking (Notified)',
    'GP Entry Tracking',
  ],
  'Alerts on Abnormal Transactions': [
    'Alerts on Abnormal Transactions',
    'Abnormal Alerts',
  ],
  'Real-time Basis Tracking': ['Real-time Basis Tracking', 'Overview'],
  'CMS User Permission Controls': [
    'CMS User Permission Controls',
    'User Rights Controls',
  ],
};

export function hasCmsPermission(
  subModuleLabel: string,
  action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' = 'canView',
): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const perms = user.permissions;
  if (!perms || !Array.isArray(perms) || perms.length === 0) {
    return ['ADMIN', 'PLANT_MANAGER'].includes(user.role || '');
  }
  if (typeof perms[0] === 'string') {
    return perms.some((p) => String(p).toLowerCase() === CMS.toLowerCase());
  }

  if (subModuleLabel) {
    const accepted = (
      SUB_ALIASES[subModuleLabel] || [subModuleLabel]
    ).map((s) => s.toLowerCase());
    const subRow = perms.find((p: any) => {
      const mod = (p.moduleName || p.name || '').toLowerCase();
      const s = (p.subModuleName || '').toLowerCase();
      return mod === CMS.toLowerCase() && accepted.includes(s);
    });
    if (subRow && permFlag(subRow, action)) return true;
  }

  const parent = perms.find((p: any) => {
    const mod = (p.moduleName || p.name || '').toLowerCase();
    const s = p.subModuleName || '';
    return mod === CMS.toLowerCase() && (!s || s === '');
  });
  return !!parent && permFlag(parent, action);
}
