import api from './axios';

export const financeApi = {
  getLedger: async (plantId: string, type: 'PURCHASE' | 'SALE') => {
    const response = await api.get('/finance/ledger', { params: { plantId, type } });
    return response.data;
  },
  
  getExpenseSummary: async (plantId: string) => {
    const response = await api.get('/finance/expenses', { params: { plantId } });
    return response.data;
  },
  
  getCashbook: async (plantId: string) => {
    const response = await api.get('/finance/cashbook', { params: { plantId } });
    return response.data;
  },
  
  getOutstanding: async (plantId: string) => {
    const response = await api.get('/finance/outstanding', { params: { plantId } });
    return response.data;
  },
  
  createTransaction: async (data: any) => {
    const response = await api.post('/finance/transaction', data);
    return response.data;
  }
};
