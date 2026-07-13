import api from './axios';

export const inventoryApi = {
  getDashboardSummary: (params?: { itemType?: string }) => 
    api.get('/inventory/dashboard', { params }),
  getInventoryList: (params?: { itemType?: string; godown?: string; search?: string; category?: string; variety?: string }) => 
    api.get('/inventory', { params }),
  getStockReport: (date?: string) => 
    api.get('/inventory/stock-report', { params: { date } })
};
