import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Plant {
  id: string;
  name: string;
  code: string;
}

interface PlantState {
  activePlant: Plant | null;
  setActivePlant: (plant: Plant) => void;
  clearActivePlant: () => void;
}

export const usePlantStore = create<PlantState>()(
  persist(
    (set) => ({
      activePlant: null,
      setActivePlant: (plant) => set({ activePlant: plant }),
      clearActivePlant: () => set({ activePlant: null }),
    }),
    {
      name: 'plant-storage',
    }
  )
);
