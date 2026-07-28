import api from './axios';

export const powerManagementApi = {
  getDashboard: () => api.get('/power-management/dashboard').then(res => res.data),
  getSources: () => api.get('/power-management/sources').then(res => res.data),
  getTrend: () => api.get('/power-management/trend').then(res => res.data),
  getLoadDistribution: () => api.get('/power-management/load').then(res => res.data),
  getAlerts: () => api.get('/power-management/alerts').then(res => res.data),
  getSettings: () => api.get('/power-management/settings').then(res => res.data),
  updateSettings: (data: any) => api.put('/power-management/settings', data).then(res => res.data),
  seedData: () => api.post('/power-management/seed').then(res => res.data),
};
