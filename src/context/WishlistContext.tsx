"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WishlistContextType {
    wishlist: string[]; // Store product IDs
    addToWishlist: (id: string) => void;
    removeFromWishlist: (id: string) => void;
    isInWishlist: (id: string) => boolean;
    toggleWishlist: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<string[]>([]);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('wishlist');
        if (saved) {
            try {
                setWishlist(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse wishlist", e);
            }
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = (id: string) => {
        if (!wishlist.includes(id)) {
            setWishlist(prev => [...prev, id]);
        }
    };

    const removeFromWishlist = (id: string) => {
        setWishlist(prev => prev.filter(itemId => itemId !== id));
    };

    const toggleWishlist = (id: string) => {
        if (wishlist.includes(id)) {
            removeFromWishlist(id);
        } else {
            addToWishlist(id);
        }
    };

    const isInWishlist = (id: string) => wishlist.includes(id);

    return (
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (!context) throw new Error("useWishlist must be used within WishlistContext");
    return context;
}
