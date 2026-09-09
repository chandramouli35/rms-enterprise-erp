import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SodaDeals } from '../components/Finance/SodaDeals';
import { SalePurchaseReport } from '../components/Finance/SalePurchaseReport';

const STUBS: Record<string, { title: string; feedback: string }> = {
  receivables: { title: 'Receivables', feedback: 'Feedback 31' },
  payables: { title: 'Payables', feedback: 'Feedback 31' },
  payment_received: { title: 'Payment Received', feedback: 'Feedback 31' },
  payment_paid: { title: 'Payment Paid', feedback: 'Feedback 31' },
};

export const FinanceManagement: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'soda';

  useEffect(() => {
    if (!params.get('tab')) {
      setParams({ tab: 'soda' }, { replace: true });
    }
  }, []);

  const stub = STUBS[tab];

  return (
    <div className="p-2 md:p-4">
      {tab === 'soda' && <SodaDeals />}
      {tab === 'sale' && <SalePurchaseReport reportType="SALE" />}
      {tab === 'purchase' && <SalePurchaseReport reportType="PURCHASE" />}
      {stub && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-8 text-center max-w-xl mx-auto mt-8">
          <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">{stub.title}</h2>
          <p className="text-[var(--text-muted)] text-sm">
            This subsection is specified in <strong className="text-[var(--text-main)]">{stub.feedback}</strong>.
            Navigation is enabled; full UI arrives with that feedback.
          </p>
        </div>
      )}
    </div>
  );
};
