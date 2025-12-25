"use client";

import { useSession } from "next-auth/react";
import { useUserStore } from "@/store/useUserStore";
import { useEffect } from "react";

export default function SessionSync() {
    const { data: session, status } = useSession();
    const { setUser } = useUserStore();

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            // Map NextAuth user to Zustand user
            setUser({
                id: session.user.id,
                email: session.user.email || undefined,
                name: session.user.name || undefined,
                image: session.user.image || undefined,
                phone: (session.user as any).phone || "", // Cast if phone is custom
            });
        } else if (status === "unauthenticated") {
            // Optional: Logout from store if session invalid?
            // setUser(null); 
            // Better not auto-logout aggressively if we want persist, but for sync correctness:
            // setUser(null); 
        }
    }, [session, status, setUser]);

    return null;
}
