import api from './axios';

export const inventoryApi = {
  getDashboardSummary: (params?: { itemType?: string }) =>
    api.get('/api/inventory/dashboard', { params }),
  getInventoryList: (params?: {
    itemType?: string;
    godown?: string;
    search?: string;
    category?: string;
    variety?: string;
  }) => api.get('/api/inventory', { params }),
  getStockReport: (date?: string) =>
    api.get('/api/inventory/stock-report', { params: { date } }),
};
