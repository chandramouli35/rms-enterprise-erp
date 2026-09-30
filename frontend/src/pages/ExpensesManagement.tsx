import React, { useEffect } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { AddFundsPanel } from '../components/Expenses/AddFundsPanel';
import { ExpenseEntryPanel } from '../components/Expenses/ExpenseEntryPanel';
import { PettyCashbookPanel } from '../components/Expenses/PettyCashbookPanel';
import { CogsPanel } from '../components/Expenses/CogsPanel';
import { useAuthStore } from '../store/authStore';

const ALLOWED = ['SUPER_ADMIN', 'ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'ACCOUNTANT'];

export const ExpensesManagement: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const tab = params.get('tab') || 'add_funds';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const roleOk = ALLOWED.includes(user?.role || '');

  useEffect(() => {
    if (!params.get('tab')) {
      setParams({ tab: isAdmin ? 'add_funds' : 'expenses' }, { replace: true });
    }
  }, []);

  if (!roleOk) {
    return (
      <div className="p-8 text-center text-sm text-[var(--text-muted)]">
        You do not have access to Expenses.
      </div>
    );
  }

  if (tab === 'add_funds' && !isAdmin) {
    return <Navigate to="/expenses?tab=expenses" replace />;
  }

  return (
    <div className="p-2 md:p-4">
      {tab === 'add_funds' && isAdmin && <AddFundsPanel />}
      {tab === 'expenses' && <ExpenseEntryPanel />}
      {tab === 'petty_cashbook' && <PettyCashbookPanel />}
      {tab === 'cogs' && <CogsPanel />}
    </div>
  );
};
