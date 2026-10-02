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

export function oilResultAfterCut(oilResult: number | null | undefined): number | null {
  if (oilResult == null || Number.isNaN(Number(oilResult)) || Number(oilResult) <= 0) return null;
  const A = Number(oilResult) - 1;
  return A > 15 ? (A - 15) / 2 + 15 : A;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Live V / W / Y preview while typing Oil (O) or CD% (X) — matches backend shapeLine */
export function liveBillingPreview(row: {
  isShift?: boolean;
  isRiceBran?: boolean;
  rate?: number | null;
  lowerWeight?: number;
  netWeightMill?: number;
  netWeightParty?: number;
  bags?: number;
  bagWeightConsideration?: boolean;
  bagTareTotal?: number;
  bagType?: string | null;
  weightsMissing?: boolean;
  cdPercent?: number;
}, oilOverride?: number | null, cdOverride?: number | null) {
  if (row.weightsMissing) {
    return { oilAfterCut: null as number | null, rateV: null as number | null, billAmount: 0, netPayment: 0 };
  }
  let millNet = Number(row.netWeightMill) || 0;
  let partyNet = Number(row.netWeightParty) || 0;
  // If oil draft only, Q/R already from server; recompute lower from current nets
  const lower = round3(Math.min(millNet, partyNet));
  const oilAfter =
    oilOverride != null && oilOverride > 0 ? oilResultAfterCut(oilOverride) : null;
  const rateD = row.isShift ? null : row.rate != null ? Number(row.rate) : null;
  let rateV: number | null = null;
  if (row.isShift) rateV = null;
  else if (row.isRiceBran) {
    rateV =
      oilAfter != null && rateD != null ? round3(oilAfter * rateD) : null;
  } else rateV = rateD;
  const billAmount = rateV != null ? round3(rateV * lower) : 0;
  const cd = cdOverride != null ? Number(cdOverride) : Number(row.cdPercent) || 0;
  const netPayment = round3(billAmount - billAmount * (cd / 100));
  return { oilAfterCut: oilAfter, rateV, billAmount, netPayment };
}
