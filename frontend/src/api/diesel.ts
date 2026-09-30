import api from './axios';

export const dieselApi = {
  trucks: () => api.get('/diesel/trucks'),
  drivers: () => api.get('/diesel/drivers'),
  parties: () => api.get('/diesel/parties'),
  lastForTruck: (truckId: string) => api.get(`/diesel/trucks/${truckId}/last`),
  createEntry: (data: any) => api.post('/diesel/entries', data),
  truckAverage: (params?: {
    truckId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => api.get('/diesel/truck-average', { params }),
  partyList: () => api.get('/diesel/party-list'),
  partyWise: (params: {
    partyId: string;
    from?: string;
    to?: string;
    slipFrom?: number;
    slipTo?: number;
  }) => api.get('/diesel/party-wise', { params }),
};
