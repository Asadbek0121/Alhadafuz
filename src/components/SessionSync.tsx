"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";

export default function SessionSync() {
    const { data: session, status } = useSession();
    const { setUser, user: storeUser } = useUserStore();

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            // Only update if store is empty or different
            // We cast because session user might have extra fields we added
            const sessionUser = session.user as any;

            const hasChanged = !storeUser ||
                storeUser.id !== sessionUser.id ||
                storeUser.uniqueId !== sessionUser.uniqueId ||
                storeUser.role !== sessionUser.role;

            if (hasChanged) {
                setUser({
                    id: sessionUser.id,
                    email: sessionUser.email,
                    name: sessionUser.name,
                    image: sessionUser.image,
                    role: sessionUser.role,
                    uniqueId: sessionUser.uniqueId,
                    phone: sessionUser.phone,
                    twoFactorEnabled: sessionUser.twoFactorEnabled,
                    notificationsEnabled: sessionUser.notificationsEnabled,
                    hasPin: sessionUser.hasPin,
                });
            }
        } else if (status === "unauthenticated" && storeUser) {
            // setUser(null); // Optional: Clear store on logout if not already done
        }
    }, [session, status, storeUser, setUser]);

    return null;
}
