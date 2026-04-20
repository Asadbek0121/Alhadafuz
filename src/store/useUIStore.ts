import { create } from 'zustand';

type ActiveMenu = 'catalog' | 'notifications' | 'language' | null;

interface UIStore {
    activeMenu: ActiveMenu;
    isCatalogOpen: boolean; // Keep for compatibility with existing code
    setActiveMenu: (menu: ActiveMenu) => void;
    toggleMenu: (menu: ActiveMenu) => void;
    closeAllMenus: () => void;
    
    // Legacy support for existing components
    toggleCatalog: () => void;
    openCatalog: () => void;
    closeCatalog: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    activeMenu: null,
    isCatalogOpen: false,

    setActiveMenu: (menu) => set({ 
        activeMenu: menu,
        isCatalogOpen: menu === 'catalog' 
    }),

    toggleMenu: (menu) => set((state) => {
        const isCurrentlyOpen = state.activeMenu === menu;
        const nextMenu = isCurrentlyOpen ? null : menu;
        return {
            activeMenu: nextMenu,
            isCatalogOpen: nextMenu === 'catalog'
        };
    }),

    closeAllMenus: () => set({ activeMenu: null, isCatalogOpen: false }),

    // Legacy implementations
    toggleCatalog: () => set((state) => {
        const nextOpen = !state.isCatalogOpen;
        return {
            isCatalogOpen: nextOpen,
            activeMenu: nextOpen ? 'catalog' : (state.activeMenu === 'catalog' ? null : state.activeMenu)
        };
    }),
    openCatalog: () => set({ isCatalogOpen: true, activeMenu: 'catalog' }),
    closeCatalog: () => set((state) => ({ 
        isCatalogOpen: false, 
        activeMenu: state.activeMenu === 'catalog' ? null : state.activeMenu 
    })),
}));
