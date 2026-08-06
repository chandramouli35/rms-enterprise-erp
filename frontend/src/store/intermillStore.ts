import { create } from 'zustand';
import api from '../api/axios';

interface IntermillState {
  batches: any[];
  fetchBatches: () => Promise<void>;
  createBatch: (data: any) => Promise<any>;
  approveBatch: (id: string) => Promise<void>;
  loading: boolean;
}

export const useIntermillStore = create<IntermillState>((set) => ({
  batches: [],
  loading: false,

  fetchBatches: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/api/production/intermill');
      set({ batches: res.data });
    } catch (error) {
      console.error('Error fetching intermill batches', error);
    } finally {
      set({ loading: false });
    }
  },

  createBatch: async (data: any) => {
    const res = await api.post('/api/production/intermill', data);
    set((state) => ({ batches: [res.data, ...state.batches] }));
    return res.data;
  },

  approveBatch: async (id: string) => {
    try {
      await api.post(`/api/production/intermill/${id}/approve`);
      set((state) => ({
        batches: state.batches.map(b => b.id === id ? { ...b, status: 'COMPLETED' } : b)
      }));
    } catch (error) {
      console.error('Error approving intermill batch', error);
      throw error;
    }
  }
}));
