import api from './axios';

export const salePurchaseApi = {
  list: (reportType: 'SALE' | 'PURCHASE', plantId?: string) =>
    api.get('/finance/sale-purchase-report', {
      params: { reportType, ...(plantId ? { plantId } : {}) },
    }),
  update: (id: string, body: any) => api.patch(`/finance/sale-purchase-report/${id}`, body),
  paymentStatus: (id: string, paymentStatus: string, plantId?: string) =>
    api.patch(`/finance/sale-purchase-report/${id}/payment-status`, {
      paymentStatus,
      ...(plantId ? { plantId } : {}),
    }),
  audits: (financeSodaId?: string) =>
    api.get('/finance/payment-status-audits', {
      params: financeSodaId ? { financeSodaId } : {},
    }),
  backfill: () => api.post('/finance/sale-purchase-report/backfill'),
};

/** Section P live formula (matches backend) */
export function oilResultAfterCut(oilResult: number | null | undefined): number | null {
  if (oilResult == null || Number.isNaN(Number(oilResult)) || Number(oilResult) <= 0) return null;
  const A = Number(oilResult) - 1;
  return A > 15 ? (A - 15) / 2 + 15 : A;
}
