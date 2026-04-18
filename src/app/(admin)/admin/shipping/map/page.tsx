// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import LiveMap from "@/components/admin/LiveMap";
import { Suspense } from "react";
import { ChevronLeft, Activity } from "lucide-react";
import Link from "next/link";

export default function AdminMapPage() {
    return (
        <div className="flex flex-col h-screen bg-slate-50/30 overflow-hidden">
            <div className="p-6 md:p-8 flex items-center justify-between bg-white/50 backdrop-blur-xl border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-6">
                    <Link
                        href="/admin/shipping"
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white border border-slate-100 shadow-xl shadow-slate-200/50 transition-all active:scale-95 group"
                    >
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Kuryerlar Monitoringi</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Hadaf Intelligence Systems © 2026</p>
                        </div>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-900 uppercase">Status</p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Tizim Faol</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Activity size={20} />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="h-full w-full">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                        <LiveMap />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
