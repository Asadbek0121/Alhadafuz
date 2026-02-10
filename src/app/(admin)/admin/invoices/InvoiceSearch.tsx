"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce"; // Assuming this exists or I'll create it

export default function InvoiceSearch() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }
        replace(`${pathname}?${params.toString()}`);
    }, [debouncedSearch, pathname, replace]);

    return (
        <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mijoz yoki ID bo'yicha qidirish..."
                className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm shadow-sm"
            />
            {searchTerm && (
                <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
