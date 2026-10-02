import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Plant {
  id: string;
  name: string;
  code: string;
  govtRate?: number;
  benchmarkMoisture?: number;
  safaiCut?: number;
  processingCut?: number;
  standardBagWeight?: number;
  allowManualDateTimePaddyInward?: boolean;
  allowManualDateTimeGateIn?: boolean;
  allowManualDateTimeGateOut?: boolean;
  allowManualDateTimeStackTransfer?: boolean;
  /** @deprecated use form-specific flags */
  allowManualDateTime?: boolean;
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
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
