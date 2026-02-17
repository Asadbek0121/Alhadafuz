import { create } from 'zustand';

interface ChatState {
    isOpen: boolean;
    view: 'menu' | 'chat';
    openChat: () => void;
    openMenu: () => void;
    closeChat: () => void;
    toggleChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    isOpen: false,
    view: 'menu',
    openChat: () => set({ isOpen: true, view: 'chat' }),
    openMenu: () => set({ isOpen: true, view: 'menu' }),
    closeChat: () => set({ isOpen: false }),
    toggleChat: () => set((state) => ({
        isOpen: !state.isOpen,
        view: !state.isOpen ? 'menu' : state.view
    })),
}));
