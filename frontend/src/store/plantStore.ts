import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Plant {
  id: string;
  name: string;
  code: string;
  govtRate?: number;
}

interface PlantState {
  activePlant: Plant | null;
  contextMode: 'plant' | 'compare' | 'consolidated';
  setActivePlant: (plant: Plant) => void;
  setContextMode: (mode: 'plant' | 'compare' | 'consolidated') => void;
  clearActivePlant: () => void;
}

export const usePlantStore = create<PlantState>()(
  persist(
    (set) => ({
      activePlant: null,
      contextMode: 'consolidated',
      setActivePlant: (plant) => set({ activePlant: plant, contextMode: 'plant' }),
      setContextMode: (mode) => set((state) => ({ contextMode: mode, activePlant: mode === 'plant' ? state.activePlant : null })),
      clearActivePlant: () => set({ activePlant: null, contextMode: 'consolidated' }),
    }),
    {
      name: 'plant-storage',
    }
  )
);
