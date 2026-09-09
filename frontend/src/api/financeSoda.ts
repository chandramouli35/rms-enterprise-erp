import api from './axios';

export const financeSodaApi = {
  list: (sodaType?: string) =>
    api.get('/finance/sodas', { params: sodaType ? { sodaType } : {} }),
  nextNumber: (sodaType: 'SALE' | 'PURCHASE') =>
    api.get('/finance/sodas/next-number', { params: { sodaType } }),
  create: (data: any) => api.post('/finance/sodas', data),
  update: (id: string, data: { quantity?: number; note?: string }) =>
    api.patch(`/finance/sodas/${id}`, data),
  paymentStatus: (id: string, paymentStatus: string) =>
    api.patch(`/finance/sodas/${id}/payment-status`, { paymentStatus }),
  partyOptions: (excludePlantIds?: string[]) =>
    api.get('/finance/party-options', {
      params: excludePlantIds?.length ? { excludePlantIds: excludePlantIds.join(',') } : {},
    }),
  createParty: (data: { name: string; contact?: string; firmName?: string }) =>
    api.post('/finance/parties', data),
  availableForGp: (plantId: string, passType: string) =>
    api.get('/finance/sodas/available-for-gp', { params: { plantId, passType } }),
};
