import React, { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { AddFuelPanel } from '../components/Diesel/AddFuelPanel';
import { TruckAveragePanel } from '../components/Diesel/TruckAveragePanel';
import { PumpWisePanel } from '../components/Diesel/PumpWisePanel';
import {
  DIESEL_TAB_SUBMODULE,
  hasDieselPermission,
} from '../utils/dieselPermissions';

export const TrucksDieselManagement: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'add_fuel';

  const firstAllowed = Object.entries(DIESEL_TAB_SUBMODULE).find(([, label]) =>
    hasDieselPermission(label, 'canView'),
  );

  useEffect(() => {
    if (!params.get('tab') && firstAllowed) {
      setParams({ tab: firstAllowed[0] }, { replace: true });
    }
  }, [params, setParams, firstAllowed]);

  if (!firstAllowed) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        You do not have permission to view Trucks & Diesel.
      </div>
    );
  }

  const sub = DIESEL_TAB_SUBMODULE[tab];
  if (sub && !hasDieselPermission(sub, 'canView')) {
    return <Navigate to={`/diesel?tab=${firstAllowed[0]}`} replace />;
  }

  return (
    <div className="p-2 md:p-4">
      {tab === 'add_fuel' && <AddFuelPanel />}
      {tab === 'truck_average' && <TruckAveragePanel />}
      {tab === 'pump_wise' && <PumpWisePanel />}
    </div>
  );
};
