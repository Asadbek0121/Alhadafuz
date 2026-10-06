"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PackageSearch, Search } from "lucide-react";

export default function TrackPage() {
    const t = useTranslations('Meta.track');
    const [orderId, setOrderId] = useState("");
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (orderId.trim()) {
            router.push(`/track/${encodeURIComponent(orderId.trim())}`);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="w-full max-w-lg bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <PackageSearch size={24} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">{t('title')}</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{t('description')}</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="space-y-4">
                    <div>
                        <label htmlFor="orderId" className="block text-xs font-bold text-slate-900 mb-1.5 ml-1">
                            {t('order_number')}
                        </label>
                        <input
                            id="orderId"
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            placeholder={t('placeholder')}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm transition-all"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Search size={16} />
                        {t('search')}
                    </button>
                </form>
            </div>
        </div>
    );
}
