"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    ArrowLeft, RefreshCcw, ShieldAlert, CheckCircle, Clock,
    Calendar, Hash, Activity, Terminal, ShieldCheck,
    AlertCircle, Search, ExternalLink, Filter, Copy,
    ChevronDown, Download, PieChart, Zap
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PaymentLog {
    id: string;
    provider: string;
    transactionId: string | null;
    amount: number | null;
    status: string;
    requestData: string | null;
    responseData: string | null;
    ipAddress: string | null;
    createdAt: string;
}

export default function PaymentLogsPage() {
    const [selectedLog, setSelectedLog] = useState<PaymentLog | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [providerFilter, setProviderFilter] = useState("ALL");

    const { data: logs, isLoading, refetch, isRefetching } = useQuery<PaymentLog[]>({
        queryKey: ['payment-logs'],
        queryFn: async () => {
            const res = await fetch('/api/admin/payment-logs');
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 10000
    });

    const stats = useMemo(() => {
        if (!logs) return { total: 0, success: 0, error: 0, rate: 0 };
        const total = logs.length;
        const success = logs.filter(l => l.status.toUpperCase() === 'SUCCESS').length;
        const error = logs.filter(l => ['ERROR', 'FAILED', 'SIGNATURE_FAILED'].includes(l.status.toUpperCase())).length;
        const rate = total > 0 ? Math.round((success / total) * 100) : 0;
        return { total, success, error, rate };
    }, [logs]);

    const getStatusConfig = (status: string) => {
        const s = status.toUpperCase();
        if (s === 'SUCCESS') return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: <ShieldCheck size={14} />, label: 'Muvaffaqiyatli' };
        if (s === 'ERROR' || s === 'SIGNATURE_FAILED' || s === 'FAILED') return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: <ShieldAlert size={14} />, label: 'Xatolik' };
        return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <Clock size={14} />, label: 'Kutilmoqda' };
    };

    const filteredLogs = logs?.filter(log => {
        const matchesSearch = log.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.status.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || log.status.toUpperCase() === statusFilter;
        const matchesProvider = providerFilter === 'ALL' || log.provider.toUpperCase() === providerFilter;
        return matchesSearch && matchesStatus && matchesProvider;
    });

    const providers = Array.from(new Set(logs?.map(l => l.provider.toUpperCase()) || []));

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Nusxa olindi");
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <Link href="/admin/payments">
                        <Button variant="ghost" size="icon" className="rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 hover:text-blue-600 transition-all active:scale-90 h-14 w-14">
                            <ArrowLeft size={24} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase leading-none">Audit Jurnali</h1>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                            <Activity size={12} className="text-blue-500" /> Tranzaksiyalar monitoringi
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => {
                            toast.success("Loglar eksport qilinmoqda...");
                        }}
                        variant="outline"
                        className="gap-2 bg-white border-gray-100 rounded-2xl hover:bg-gray-50 font-black uppercase tracking-widest shadow-sm h-14 px-6 text-[10px] italic"
                    >
                        <Download size={16} /> Eksport
                    </Button>
                    <Button
                        onClick={() => refetch()}
                        variant="default"
                        className="gap-2 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl h-14 px-6 text-[10px] italic"
                    >
                        <RefreshCcw size={16} className={isRefetching ? "animate-spin" : ""} />
                        Yangilash
                    </Button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard icon={<Activity />} label="JAMI SO'ROVLAR" value={stats.total} color="blue" />
                <MetricCard icon={<ShieldCheck />} label="MUVAFFAQIYATLI" value={stats.success} color="emerald" />
                <MetricCard icon={<ShieldAlert />} label="XATOLIKLAR" value={stats.error} color="red" />
                <MetricCard icon={<Zap />} label="SAMARADORLIK" value={`${stats.rate}%`} color="indigo" />
            </div>

            {/* Filters Bar */}
            <div className="bg-white/50 backdrop-blur rounded-[32px] border border-gray-100 p-6 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tranzaksiya ID yoki status bo'yicha qidirish..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm italic"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-4 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-blue-500/10 font-bold text-xs appearance-none uppercase tracking-widest cursor-pointer"
                        >
                            <option value="ALL">BARCHA STATUSLAR</option>
                            <option value="SUCCESS">MUVAFFAQIYATLI</option>
                            <option value="ERROR">XATOLIKLAR</option>
                            <option value="PENDING">KUTILMOQDA</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                    </div>

                    <div className="relative">
                        <select
                            value={providerFilter}
                            onChange={(e) => setProviderFilter(e.target.value)}
                            className="pl-4 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-blue-500/10 font-bold text-xs appearance-none uppercase tracking-widest cursor-pointer"
                        >
                            <option value="ALL">BARCHA TIZIMLAR</option>
                            {providers.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Logs Table Area */}
                <div className="xl:col-span-8 bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/20 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-6 text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">Vaqt & Sana</th>
                                    <th className="px-8 py-6 text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">Tizim</th>
                                    <th className="px-8 py-6 text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-6 text-[10px] uppercase font-black text-gray-400 tracking-[0.2em] text-right">Mablag'</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="relative w-12 h-12">
                                                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse" />
                                                    <RefreshCcw className="animate-spin text-blue-500 w-12 h-12" />
                                                </div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic">Ma'lumotlar olinmoqda...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs?.map((log, index) => {
                                        const config = getStatusConfig(log.status);
                                        const isSelected = selectedLog?.id === log.id;
                                        return (
                                            <motion.tr
                                                key={log.id}
                                                onClick={() => setSelectedLog(log)}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className={`cursor-pointer transition-all duration-300 hover:bg-blue-50/30 group ${isSelected ? 'bg-blue-50/50' : 'white'}`}
                                            >
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-[14px] ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'} flex items-center justify-center transition-all duration-500`}>
                                                            <Calendar size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-gray-900 italic leading-none">{format(new Date(log.createdAt), 'HH:mm:ss')}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{format(new Date(log.createdAt), 'dd.MM.yyyy')}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                        <span className="text-sm font-black text-gray-700 tracking-tight uppercase italic">{log.provider}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] border shadow-sm ${config.bg} ${config.color} ${config.border}`}>
                                                        {config.icon}
                                                        <span className="text-[10px] font-black uppercase tracking-tight italic">{config.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className="text-base font-black text-gray-900 tabular-nums">
                                                        {log.amount?.toLocaleString() || '0'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-gray-300 uppercase ml-1 italic">uzs</span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                                {filteredLogs?.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40 grayscale group hover:grayscale-0 transition-all">
                                                <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-100">
                                                    <PieChart size={48} />
                                                </div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic mt-2">Loglar mavjud emas</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Panel */}
                <div className="xl:col-span-4 space-y-6 sticky top-8">
                    <AnimatePresence mode="wait">
                        {selectedLog ? (
                            <motion.div
                                key={selectedLog.id}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white rounded-[48px] border border-gray-100 shadow-2xl p-10 space-y-8 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-40 h-40 bg-gray-50/50 rounded-full -mr-20 -mt-20 z-0" />

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase leading-none">Tafsilotlar</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2 italic">Tranzaksiya arxivi</p>
                                        </div>
                                        <button onClick={() => setSelectedLog(null)} className="p-3 bg-gray-50 hover:bg-white hover:shadow-lg rounded-2xl transition-all group">
                                            <X size={20} className="text-gray-400 group-hover:text-red-500" />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4">
                                            <DetailItem
                                                icon={<Hash size={18} />}
                                                label="TRANSAKSIYA ID"
                                                value={selectedLog.transactionId || "YO'Q"}
                                                color="blue"
                                                canCopy
                                                onCopy={() => copyToClipboard(selectedLog.transactionId || '')}
                                            />
                                            <DetailItem
                                                icon={<Activity size={18} />}
                                                label="IP MANZIL (CLIENT)"
                                                value={selectedLog.ipAddress || "MA'LUMOT YO'Q"}
                                                color="indigo"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between ml-2">
                                                <div className="flex items-center gap-2">
                                                    <Terminal size={16} className="text-emerald-500" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Server Payload</span>
                                                </div>
                                                {selectedLog.requestData && (
                                                    <button
                                                        onClick={() => copyToClipboard(selectedLog.requestData!)}
                                                        className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                                                    >
                                                        <Copy size={10} /> Nusxa olish
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative group/code">
                                                <div className="absolute right-4 top-4 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                </div>
                                                <pre className="bg-[#0f172a] p-6 rounded-[32px] text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[350px] shadow-2xl border border-slate-800 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                                                    {selectedLog.requestData ? JSON.stringify(JSON.parse(selectedLog.requestData), null, 2) : '{}'}
                                                </pre>
                                            </div>
                                        </div>

                                        {selectedLog.responseData && (
                                            <div className="space-y-3 bg-blue-50/30 p-6 rounded-[32px] border border-blue-100/50">
                                                <div className="flex items-center gap-2 ml-1">
                                                    <ExternalLink size={16} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic">Tizim Metadata</span>
                                                </div>
                                                <div className="text-[11px] font-mono text-blue-700 break-all leading-relaxed italic">
                                                    {selectedLog.responseData}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-[48px] border border-gray-100 p-16 text-center shadow-sm relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-transparent pointer-events-none" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center text-gray-200 border border-gray-50 mb-8 transform hover:rotate-12 transition-transform duration-700">
                                        <Filter size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight italic uppercase">Tanlov kutilmoqda</h3>
                                    <p className="text-gray-400 text-xs mt-3 leading-relaxed max-w-[200px] font-medium italic">
                                        Batafsil ma'lumotni kshirish uchun chapdagi ro'yxatdan tranzaksiyani tanlang.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: any, label: string, value: any, color: 'blue' | 'emerald' | 'red' | 'indigo' }) {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        red: 'text-red-600 bg-red-50 border-red-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    };

    return (
        <div className="bg-white p-7 rounded-[40px] border border-gray-100 shadow-sm flex flex-col gap-4 hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
            <div className={`absolute -right-2 -top-2 opacity-5 scale-[2] group-hover:rotate-12 transition-transform duration-700`}>{icon}</div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colors[color]} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{label}</p>
                <p className="text-3xl font-black text-gray-900 mt-1 tabular-nums tracking-tighter italic">{value}</p>
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value, color, canCopy, onCopy }: { icon: any, label: string, value: string, color: string, canCopy?: boolean, onCopy?: () => void }) {
    return (
        <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-50 space-y-3 group/item">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-blue-500">{icon}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">{label}</span>
                </div>
                {canCopy && (
                    <button onClick={onCopy} className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500">
                        <Copy size={12} />
                    </button>
                )}
            </div>
            <div className={`text-xs font-black italic break-all leading-relaxed ${canCopy ? 'text-blue-600 bg-white p-3 rounded-2xl shadow-inner border border-blue-50' : 'text-gray-700'}`}>
                {value}
            </div>
        </div>
    );
}

function X({ size, className }: { size: number, className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    )
}
