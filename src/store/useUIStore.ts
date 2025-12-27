import { create } from 'zustand';

interface UIStore {
    isCatalogOpen: boolean;
    toggleCatalog: () => void;
    openCatalog: () => void;
    closeCatalog: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    isCatalogOpen: false,
    toggleCatalog: () => set((state) => ({ isCatalogOpen: !state.isCatalogOpen })),
    openCatalog: () => set({ isCatalogOpen: true }),
    closeCatalog: () => set({ isCatalogOpen: false }),
}));
