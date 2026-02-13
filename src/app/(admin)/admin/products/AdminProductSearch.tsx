"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export default function AdminProductSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const initialQuery = searchParams.get("q") || "";
    const [query, setQuery] = useState(initialQuery);

    const debouncedQuery = useDebounce(query, 500);

    useEffect(() => {
        if (debouncedQuery !== initialQuery) {
            startTransition(() => {
                const params = new URLSearchParams(searchParams.toString());
                if (debouncedQuery) {
                    params.set("q", debouncedQuery);
                } else {
                    params.delete("q");
                }
                params.set("page", "1"); // Reset to page 1 on search
                router.push(`/admin/products?${params.toString()}`);
            });
        }
    }, [debouncedQuery, initialQuery, router, searchParams]);

    return (
        <div className="relative w-full max-w-md group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                <Search size={18} />
            </div>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mahsulot nomi bo'yicha qidirish..."
                className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-12 pr-10 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-sm shadow-sm"
            />
            {query && (
                <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
                >
                    <X size={14} strokeWidth={3} />
                </button>
            )}
            {isPending && (
                <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-indigo-100 overflow-hidden rounded-full">
                    <div className="h-full bg-indigo-600 animate-progress w-1/2" />
                </div>
            )}
        </div>
    );
}
