import api from './axios';

export type PartyRole = 'CUSTOMER' | 'SUPPLIER' | 'ALL';

export const financeMasterApi = {
  list: (params?: { type?: string; q?: string }) =>
    api.get('/finance/masters', { params }),
  create: (data: {
    name: string;
    isCustomer: boolean;
    isSupplier: boolean;
    contact?: string;
    firmName?: string;
    notes?: string;
  }) => api.post('/finance/masters', data),
  update: (
    id: string,
    data: {
      name?: string;
      isCustomer?: boolean;
      isSupplier?: boolean;
      isActive?: boolean;
      contact?: string;
      firmName?: string;
      notes?: string;
    },
  ) => api.patch(`/finance/masters/${id}`, data),
};
