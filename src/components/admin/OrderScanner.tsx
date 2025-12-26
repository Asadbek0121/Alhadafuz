
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanBarcode, X } from 'lucide-react';

export default function OrderScanner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('search') || '');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
            params.set('search', query.trim());
        } else {
            params.delete('search');
        }
        params.delete('page'); // Reset to page 1
        router.replace(`/admin/orders?${params.toString()}`);
    };

    const clearSearch = () => {
        setQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('search');
        router.replace(`/admin/orders?${params.toString()}`);
        inputRef.current?.focus();
    };

    // Auto-search if using a USB scanner (it types fast and hits enter)
    // The form onSubmit handles the Enter key automatically.

    return (
        <form onSubmit={handleSearch} className="relative flex items-center">
            <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Shtrix-kodni skanerlang..."
                    className="pl-9 pr-8 h-9 w-64 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                    autoComplete="off"
                />
                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </form>
    );
}
