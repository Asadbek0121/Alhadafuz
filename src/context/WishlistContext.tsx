"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WishlistContextType {
    wishlist: string[]; // Store product IDs
    addToWishlist: (id: string) => void;
    removeFromWishlist: (id: string) => void;
    isInWishlist: (id: string) => boolean;
    toggleWishlist: (id: string) => void;
}

const WishlistContext = createContext<WishlistContextType>({
    wishlist: [],
    addToWishlist: () => {},
    removeFromWishlist: () => {},
    isInWishlist: () => false,
    toggleWishlist: () => {}
});

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    // Ensure we only run localstorage on client
    useEffect(() => {
        setIsMounted(true);
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
        if (isMounted) {
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        }
    }, [wishlist, isMounted]);

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
    if (context === undefined) {
        console.warn("useWishlist is being used outside of a WishlistProvider");
    }
    return context;
}

