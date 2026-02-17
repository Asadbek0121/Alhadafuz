import { create } from 'zustand';

interface MapState {
    isMapOpen: boolean;
    openMap: () => void;
    closeMap: () => void;
}

export const useMapStore = create<MapState>((set) => ({
    isMapOpen: false,
    openMap: () => set({ isMapOpen: true }),
    closeMap: () => set({ isMapOpen: false }),
}));
