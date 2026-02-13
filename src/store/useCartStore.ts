import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    title: string;
    price: number;
    image: string;
    quantity: number;
    hasDiscount?: boolean;
    discountType?: string;
}

interface CartState {
    items: CartItem[];
    isOpen: boolean;
    isHydrated: boolean;

    // Actions
    addToCart: (product: Omit<CartItem, 'quantity'>, openDrawer?: boolean) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
    clearCart: () => void;
    setItems: (items: CartItem[]) => void;

    // UI
    openCart: () => void;
    closeCart: () => void;
    setHydrated: () => void;

    // Computed
    total: () => number;
    itemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            isHydrated: false,

            addToCart: (product, openDrawer = true) => set((state) => {
                const existing = state.items.find(item => item.id === product.id);
                if (existing) {
                    return {
                        items: state.items.map(item =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                        isOpen: openDrawer ? true : state.isOpen,
                    };
                }
                return {
                    items: [...state.items, { ...product, quantity: 1 }],
                    isOpen: openDrawer ? true : state.isOpen,
                };
            }),

            removeFromCart: (id) => set((state) => ({
                items: state.items.filter(item => item.id !== id)
            })),

            updateQuantity: (id, delta) => set((state) => ({
                items: state.items.map(item => {
                    if (item.id === id) {
                        const newQty = Math.max(1, item.quantity + delta);
                        return { ...item, quantity: newQty };
                    }
                    return item;
                })
            })),

            clearCart: () => set({ items: [] }),
            setItems: (items) => set({ items }),

            openCart: () => set({ isOpen: true }),
            closeCart: () => set({ isOpen: false }),
            setHydrated: () => set({ isHydrated: true }),

            total: () => get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
        }),
        {
            name: 'hadaf-market-cart-v1', // More unique name to avoid localhost collisions
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        }
    )
);
