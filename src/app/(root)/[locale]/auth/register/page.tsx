"use client";

import { useEffect } from "react";
import { useRouter } from "@/navigation";

export default function RegisterPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/?auth=register");
    }, [router]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
