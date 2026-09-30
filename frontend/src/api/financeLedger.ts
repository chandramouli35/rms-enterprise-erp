import api from './axios';

export const financeLedgerApi = {
  partyOptions: (entryType?: 'RECEIPT' | 'PAYMENT') =>
    api.get('/finance/ledger/party-options', {
      params: entryType ? { entryType } : {},
    }),
  outstanding: (kind: 'RECEIVABLES' | 'PAYABLES', owingOnly = true) =>
    api.get('/finance/ledger/outstanding', {
      params: { kind, owingOnly: owingOnly ? 'true' : 'false' },
    }),
  statement: (params: { partyKey: string; from?: string; to?: string; q?: string }) =>
    api.get('/finance/ledger/statement', { params }),
  sodas: (partyKey: string, sodaType?: 'SALE' | 'PURCHASE') =>
    api.get('/finance/ledger/sodas', {
      params: { partyKey, ...(sodaType ? { sodaType } : {}) },
    }),
  payments: (entryType: 'RECEIPT' | 'PAYMENT') =>
    api.get('/finance/ledger/payments', { params: { entryType } }),
  createPayment: (data: {
    entryType: 'RECEIPT' | 'PAYMENT';
    partyKey: string;
    date: string;
    narration?: string;
    amount: number;
    notes?: string;
    financeSodaId?: string;
  }) => api.post('/finance/ledger/payments', data),
  backfill: () => api.post('/finance/ledger/backfill'),
};
