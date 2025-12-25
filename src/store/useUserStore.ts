import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id?: string;
    phone: string;
    name?: string;
    email?: string;
    address?: string;
    image?: string;
    uniqueId?: string;
    notificationsEnabled?: boolean;
    isDarkMode?: boolean;
}

interface UserState {
    user: User | null;
    isAuthenticated: boolean;
    isModalOpen: boolean;
    isHydrated: boolean;

    setUser: (user: User | null) => void;
    updateUser: (data: Partial<User>) => void;
    logout: () => void;

    openAuthModal: () => void;
    closeAuthModal: () => void;
    setHydrated: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isModalOpen: false,
            isHydrated: false,

            setUser: (user) => set({ user, isAuthenticated: !!user }),
            updateUser: (data) => set((state) => ({
                user: state.user ? { ...state.user, ...data } : null
            })),
            logout: () => set({ user: null, isAuthenticated: false }),

            openAuthModal: () => set({ isModalOpen: true }),
            closeAuthModal: () => set({ isModalOpen: false }),
            setHydrated: () => set({ isHydrated: true }),
        }),
        {
            name: 'user-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        }
    )
);
