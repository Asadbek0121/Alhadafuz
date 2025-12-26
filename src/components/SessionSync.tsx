"use client";

import { useSession } from "next-auth/react";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore } from "@/store/useCartStore";
import { useEffect, useState } from "react";

export default function SessionSync() {
    const { data: session, status } = useSession();
    const { setUser } = useUserStore();
    const { items, setItems, clearCart } = useCartStore();

    const [hasLoaded, setHasLoaded] = useState(false);

    // Initial Load & Auth
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            // 1. Sync User Data
            setUser({
                id: session.user.id,
                email: session.user.email || undefined,
                name: session.user.name || undefined,
                image: session.user.image || undefined,
                phone: (session.user as any).phone || "",
                uniqueId: (session.user as any).uniqueId,
            });

            // 2. Sync Cart Data (Initial Fetch/Merge)
            const shouldMerge = localStorage.getItem('mergeCartOnLogin');

            if (shouldMerge) {
                // MERGE
                fetch('/api/cart/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: items }) // items coming from useCartStore
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success && data.items) {
                            setItems(data.items);
                            localStorage.removeItem('mergeCartOnLogin');
                        }
                    })
                    .catch(err => console.error("Cart sync failed:", err))
                    .finally(() => setHasLoaded(true));
            } else {
                // FETCH ONLY
                fetch('/api/cart')
                    .then(res => res.json())
                    .then(data => {
                        if (data.items) {
                            // Only update if server has items, or empty list is valid.
                            // If server returns [], we set [], which is correct sync.
                            setItems(data.items);
                        }
                    })
                    .catch(err => console.error("Cart fetch failed:", err))
                    .finally(() => setHasLoaded(true));
            }

        } else if (status === "unauthenticated") {
            setUser(null);
            clearCart();
            setHasLoaded(false);
        }
    }, [session, status, setUser]);

    // Real-time Sync (Update Server on Change)
    useEffect(() => {
        if (status === "authenticated" && hasLoaded) {
            // Debounce or just fire? Debounce is better but for now simple timeout
            const timeoutId = setTimeout(() => {
                fetch('/api/cart', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: items })
                }).catch(err => console.error("Failed to sync cart changes:", err));
            }, 1000); // 1s debounce

            return () => clearTimeout(timeoutId);
        }
    }, [items, status, hasLoaded]);

    return null;
}
