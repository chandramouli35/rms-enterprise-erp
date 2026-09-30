import React, { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { SodaDeals } from '../components/Finance/SodaDeals';
import { SalePurchaseReport } from '../components/Finance/SalePurchaseReport';
import { JunctionReport } from '../components/Finance/JunctionReport';
import { ReceivablesPayables } from '../components/Finance/ReceivablesPayables';
import { PaymentEntry } from '../components/Finance/PaymentEntry';
import { MasterParties } from '../components/Finance/MasterParties';
import { FINANCE_TAB_SUBMODULE, hasFinancePermission } from '../utils/financePermissions';
import { useAuthStore } from '../store/authStore';

export const FinanceManagement: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const tab = params.get('tab') || 'soda';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!params.get('tab')) {
      setParams({ tab: 'soda' }, { replace: true });
    }
  }, []);

  // Master is Admin-only
  if (tab === 'master' && !isAdmin) {
    return <Navigate to="/finance?tab=soda" replace />;
  }

  const sub = FINANCE_TAB_SUBMODULE[tab];
  if (sub && !hasFinancePermission(sub, 'canView')) {
    // Prefer first allowed Finance tab
    const first = Object.entries(FINANCE_TAB_SUBMODULE).find(([, label]) =>
      hasFinancePermission(label, 'canView'),
    );
    if (first) return <Navigate to={`/finance?tab=${first[0]}`} replace />;
              return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        You do not have permission to view this Finance section.
    </div>
  );
  }

  return (
    <div className="p-2 md:p-4">
      {tab === 'master' && isAdmin && <MasterParties />}
      {tab === 'soda' && <SodaDeals />}
      {tab === 'sale' && <SalePurchaseReport reportType="SALE" />}
      {tab === 'purchase' && <SalePurchaseReport reportType="PURCHASE" />}
      {tab === 'junction' && <JunctionReport />}
      {tab === 'receivables' && <ReceivablesPayables kind="RECEIVABLES" />}
      {tab === 'payables' && <ReceivablesPayables kind="PAYABLES" />}
      {tab === 'payment_received' && <PaymentEntry entryType="RECEIPT" />}
      {tab === 'payment_paid' && <PaymentEntry entryType="PAYMENT" />}
    </div>
  );
};
