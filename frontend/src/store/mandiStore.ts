import { create } from 'zustand';
import api from '../api/axios';

export interface Mandi {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MandiStore {
  mandis: Mandi[];
  isLoading: boolean;
  error: string | null;
  fetchMandis: () => Promise<void>;
  createMandi: (mandi: { name: string; isActive: boolean }) => Promise<void>;
  updateMandi: (id: string, mandi: { name: string; isActive: boolean }) => Promise<void>;
  deleteMandi: (id: string) => Promise<void>;
}

export const useMandiStore = create<MandiStore>((set, get) => ({
  mandis: [],
  isLoading: false,
  error: null,

  fetchMandis: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/mandis');
      set({ mandis: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch mandis', isLoading: false });
    }
  },

  createMandi: async (mandi) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/api/mandis', mandi);
      await get().fetchMandis();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create mandi', isLoading: false });
      throw error;
    }
  },

  updateMandi: async (id, mandi) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/mandis/${id}`, mandi);
      await get().fetchMandis();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update mandi', isLoading: false });
      throw error;
    }
  },

  deleteMandi: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/mandis/${id}`);
      await get().fetchMandis();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete mandi', isLoading: false });
      throw error;
    }
  },
}));
