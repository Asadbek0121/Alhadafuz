"use client";

import { useUIStore } from '@/store/useUIStore';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

export default function ViewMoreButton() {
    const openCatalog = useUIStore((s) => s.openCatalog);
    const t = useTranslations('Header');

    return (
        <button
            type="button"
            onClick={openCatalog}
            className="group mx-auto mt-10 flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-blue-600 active:scale-95"
        >
            {t('barchasini_korish')}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
    );
}
