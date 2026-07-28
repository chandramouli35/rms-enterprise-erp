import api from './axios';

export const dispatchFinanceApi = {
  getDispatchMetrics: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/metrics/${plantId}`);
    return response.data;
  },

  getAllDispatches: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/list/${plantId}`);
    return response.data;
  },

  getVehicleAllocationStats: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/vehicle-allocation/${plantId}`);
    return response.data;
  },

  getFinanceOverview: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/finance-overview/${plantId}`);
    return response.data;
  },

  getSystemUtilities: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/utilities/${plantId}`);
    return response.data;
  },

  createDispatch: async (plantId: string, data: any) => {
    const response = await api.post(`/dispatch-finance/${plantId}`, data);
    return response.data;
  },

  generateGatePass: async (plantId: string, data: any) => {
    const response = await api.post(`/dispatch-finance/gate-pass/${plantId}`, data);
    return response.data;
  },

  getWeightVerifications: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/weight-verifications/${plantId}`);
    return response.data;
  },

  getInventoryDeductions: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/inventory-deductions/${plantId}`);
    return response.data;
  },

  readWeighbridge: async (plantId: string) => {
    const response = await api.get(`/dispatch-finance/read-weighbridge/${plantId}`);
    return response.data;
  },

  createWeightEntry: async (plantId: string, data: any) => {
    const response = await api.post(`/dispatch-finance/weight-entry/${plantId}`, data);
    return response.data;
  }
};
