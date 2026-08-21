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
    /** Eskirgan narx — chegirma ko'rsatish uchun. Agar `oldPrice > price` bo'lsa real chegirma. */
    oldPrice?: number;
    /** Tanlangan variant JSON (masalan: `{"Rang":"Qizil","Xotira":"128GB"}`). Variant bo'lmasa undefined. */
    variant?: string;
    /** Fulfillment turi: `LOCAL` (oddiy) yoki `CHINA_ORDER` (Xitoydan buyurtma). Kargo alohida hisoblanadi. */
    fulfillmentType?: 'LOCAL' | 'CHINA_ORDER';
}

/**
 * Cart item identifikatori: `productId + variant`.
 * Variant `undefined` bo'lsa — variant-siz product alohida identity hisoblanadi.
 */
export function cartItemKey(item: Pick<CartItem, 'id' | 'variant'>): string {
    return item.variant ? `${item.id}::${item.variant}` : item.id;
}

/** Cart item Xitoydan buyurtmami? */
export function isChinaItem(item: { fulfillmentType?: string }): boolean {
    return item.fulfillmentType === 'CHINA_ORDER';
}

interface CartState {
    items: CartItem[];
    isOpen: boolean;
    isHydrated: boolean;

    // Actions
    addToCart: (product: Omit<CartItem, 'quantity'>, openDrawer?: boolean, qty?: number) => void;
    removeFromCart: (id: string, variant?: string) => void;
    updateQuantity: (id: string, delta: number, variant?: string) => void;
    clearCart: () => void;
    setItems: (items: CartItem[]) => void;

    // UI
    openCart: () => void;
    closeCart: () => void;
    setHydrated: () => void;

    // Computed
    total: () => number;
    itemCount: () => number;
    /** Real chegirma summasi: `(oldPrice - price) * qty` — faqat oldPrice > price bo'lsa. */
    discount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            isHydrated: false,

            addToCart: (product, openDrawer = true, qty = 1) => set((state) => {
                const key = cartItemKey(product);
                const existing = state.items.find(item => cartItemKey(item) === key);
                if (existing) {
                    return {
                        items: state.items.map(item =>
                            cartItemKey(item) === key
                                ? { ...item, quantity: item.quantity + qty }
                                : item
                        ),
                        isOpen: openDrawer ? true : state.isOpen,
                    };
                }
                return {
                    items: [...state.items, { ...product, quantity: qty }],
                    isOpen: openDrawer ? true : state.isOpen,
                };
            }),

            removeFromCart: (id, variant) => set((state) => {
                const key = variant ? `${id}::${variant}` : id;
                return {
                    items: state.items.filter(item => cartItemKey(item) !== key)
                };
            }),

            updateQuantity: (id, delta, variant) => set((state) => {
                const key = variant ? `${id}::${variant}` : id;
                return {
                    items: state.items.map(item => {
                        if (cartItemKey(item) !== key) return item;
                        const newQty = Math.max(1, item.quantity + delta);
                        return { ...item, quantity: newQty };
                    })
                };
            }),

            clearCart: () => set({ items: [] }),
            setItems: (items) => set({ items }),

            openCart: () => set({ isOpen: true }),
            closeCart: () => set({ isOpen: false }),
            setHydrated: () => set({ isHydrated: true }),

            total: () => get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
            discount: () => get().items.reduce((sum, item) => {
                if (item.oldPrice && item.oldPrice > item.price) {
                    return sum + ((item.oldPrice - item.price) * item.quantity);
                }
                return sum;
            }, 0),
        }),
        {
            name: 'hadaf-market-cart-v1', // More unique name to avoid localhost collisions
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        }
    )
);
