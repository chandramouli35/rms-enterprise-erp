import { useAuthStore } from '../store/authStore';

const MODULE = 'Trucks & Diesel';

function permFlag(p: any, action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete') {
  if (!p) return false;
  if (p[action] === true || String(p[action]) === 'true') return true;
  const short = action.replace('can', '').toLowerCase();
  if (p[short] === true || String(p[short]) === 'true') return true;
  if (p.permissions && (p.permissions[short] === true || p.permissions[action] === true)) {
    return true;
  }
  return false;
}

/** Trucks & Diesel submodule permission (matches MODULE_STRUCTURE / Roles UI). */
export function hasDieselPermission(
  subModuleLabel: string,
  action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete' = 'canView',
): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;

  const perms = user.permissions;
  if (!perms || !Array.isArray(perms) || perms.length === 0) {
    // Role fallback until permissions are assigned in Roles
    return ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'].includes(user.role || '');
  }
  if (typeof perms[0] === 'string') {
    return perms.some((p) => String(p).toLowerCase() === MODULE.toLowerCase());
  }

  const hasDieselRows = perms.some(
    (p: any) => (p.moduleName || p.name || '').toLowerCase() === MODULE.toLowerCase(),
  );
  // Module not yet granted in Roles matrix — keep prior role access until configured
  if (!hasDieselRows) {
    return ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'].includes(user.role || '');
  }

  const sub = subModuleLabel.toLowerCase();
  const subRow = perms.find((p: any) => {
    const mod = (p.moduleName || p.name || '').toLowerCase();
    const s = (p.subModuleName || '').toLowerCase();
    return mod === MODULE.toLowerCase() && s === sub;
  });
  if (subRow && permFlag(subRow, action)) return true;

  const parent = perms.find((p: any) => {
    const mod = (p.moduleName || p.name || '').toLowerCase();
    return mod === MODULE.toLowerCase() && (!p.subModuleName || p.subModuleName === '');
  });
  if (parent && permFlag(parent, action)) return true;

  return false;
}

export const DIESEL_TAB_SUBMODULE: Record<string, string> = {
  add_fuel: 'Add Fuel',
  truck_average: 'Truck Average',
  pump_wise: 'Pump wise details',
};
