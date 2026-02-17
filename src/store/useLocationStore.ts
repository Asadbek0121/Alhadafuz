import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
    address: string | null;
    city: string | null;
    district: string | null;
    lat: number | null;
    lng: number | null;
    isLoading: boolean;
    error: string | null;

    setLocation: (data: Partial<LocationState>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useLocationStore = create<LocationState>()(
    persist(
        (set) => ({
            address: null,
            city: null,
            district: null,
            lat: null,
            lng: null,
            isLoading: false,
            error: null,

            setLocation: (data) => set((state) => ({ ...state, ...data })),
            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'hadaf-market-location',
        }
    )
);
