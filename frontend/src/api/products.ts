import api from './axios';

export const productsApi = {
  list: (page?: number, limit?: number) =>
    api.get('/api/products', { params: { page, limit } }),

  listAll: () => api.get('/api/products'),

  listUnits: () => api.get('/api/products/units/list'),

  createUnit: (data: { code: string; label: string; description?: string }) =>
    api.post('/api/products/units', data),

  forSelection: (plantId?: string) =>
    api.get('/api/products/for-selection', { params: plantId ? { plantId } : {} }),

  create: (data: {
    name: string;
    category?: string;
    description?: string;
    quantityFormat?: string;
  }) => api.post('/api/products', data),

  update: (
    id: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      quantityFormat?: string;
    },
  ) => api.patch(`/api/products/${id}`, data),

  remove: (id: string) => api.delete(`/api/products/${id}`),
};
