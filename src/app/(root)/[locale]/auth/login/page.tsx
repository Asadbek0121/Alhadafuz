"use client";

import { useEffect } from "react";
import { useRouter } from "@/navigation";

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/?auth=login");
    }, [router]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}
