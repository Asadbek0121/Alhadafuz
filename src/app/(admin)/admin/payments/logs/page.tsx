"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
    ArrowLeft, RefreshCcw, ShieldAlert, CheckCircle, Clock,
    Calendar, Hash, Activity, Terminal, ShieldCheck,
    Search, X, Copy, ChevronDown, PieChart, Zap
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
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

    const formatPayload = (raw: string | null) => {
        if (!raw) return '{}';
        try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
    };

    return (
        <div className="p-5 space-y-4 bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                    <Link href="/admin/payments">
                        <Button variant="ghost" size="icon" className="rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50 hover:text-blue-600 h-10 w-10">
                            <ArrowLeft size={18} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-none">Audit Jurnali</h1>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-2">
                            <Activity size={12} className="text-blue-500" /> Tranzaksiyalar monitoringi
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Button
                        onClick={() => refetch()}
                        variant="default"
                        className="gap-2 bg-gray-900 hover:bg-black text-white rounded-xl font-black uppercase tracking-widest shadow-md h-10 px-4 text-[10px]"
                    >
                        <RefreshCcw size={14} className={isRefetching ? "animate-spin" : ""} />
                        Yangilash
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard icon={<Activity />} label="JAMI SO'ROVLAR" value={stats.total} color="blue" />
                <MetricCard icon={<ShieldCheck />} label="MUVAFFAQIYATLI" value={stats.success} color="emerald" />
                <MetricCard icon={<ShieldAlert />} label="XATOLIKLAR" value={stats.error} color="red" />
                <MetricCard icon={<Zap />} label="SAMARADORLIK" value={`${stats.rate}%`} color="indigo" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 shadow-sm">
                <div className="relative flex-1 min-w-[280px]">
                    <label htmlFor="log-search" className="sr-only">Tranzaksiya qidirish</label>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        id="log-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tranzaksiya ID yoki status bo'yicha qidirish..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-sm"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <label htmlFor="status-filter" className="sr-only">Status filtri</label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-3 pr-9 py-2.5 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 font-bold text-xs appearance-none uppercase tracking-widest cursor-pointer"
                        >
                            <option value="ALL">BARCHA STATUSLAR</option>
                            <option value="SUCCESS">MUVAFFAQIYATLI</option>
                            <option value="ERROR">XATOLIKLAR</option>
                            <option value="PENDING">KUTILMOQDA</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                    </div>

                    <div className="relative">
                        <label htmlFor="provider-filter" className="sr-only">Tizim filtri</label>
                        <select
                            id="provider-filter"
                            value={providerFilter}
                            onChange={(e) => setProviderFilter(e.target.value)}
                            className="pl-3 pr-9 py-2.5 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 font-bold text-xs appearance-none uppercase tracking-widest cursor-pointer"
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

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                {/* Logs Table */}
                <div className="xl:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-4 py-2.5 text-[10px] uppercase font-black text-gray-400 tracking-widest">Vaqt & Sana</th>
                                    <th className="px-4 py-2.5 text-[10px] uppercase font-black text-gray-400 tracking-widest">Tizim</th>
                                    <th className="px-4 py-2.5 text-[10px] uppercase font-black text-gray-400 tracking-widest">Status</th>
                                    <th className="px-4 py-2.5 text-[10px] uppercase font-black text-gray-400 tracking-widest text-right">Mablag'</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCcw className="animate-spin text-blue-500 w-8 h-8" />
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Ma'lumotlar olinmoqda...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs?.map((log) => {
                                        const config = getStatusConfig(log.status);
                                        const isSelected = selectedLog?.id === log.id;
                                        return (
                                            <tr
                                                key={log.id}
                                                onClick={() => setSelectedLog(log)}
                                                className={`cursor-pointer hover:bg-blue-50/30 ${isSelected ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                                                            <Calendar size={14} />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-gray-900 leading-none">{format(new Date(log.createdAt), 'HH:mm:ss')}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{format(new Date(log.createdAt), 'dd.MM.yyyy')}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-sm font-black text-gray-700 tracking-tight uppercase">{log.provider}</span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${config.bg} ${config.color} ${config.border}`}>
                                                        {config.icon}
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{config.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className="text-sm font-black text-gray-900 tabular-nums">
                                                        {log.amount?.toLocaleString() || '0'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-gray-300 uppercase ml-1">uzs</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                {filteredLogs?.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-40">
                                                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-100">
                                                    <PieChart size={24} />
                                                </div>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">Loglar mavjud emas</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Panel */}
                <div className="xl:col-span-4 space-y-4 sticky top-8">
                    {selectedLog ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase leading-none">Tafsilotlar</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Tranzaksiya arxivi</p>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="p-2 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-xl text-gray-400" aria-label="Yopish">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                    <DetailItem
                                        icon={<Hash size={16} />}
                                        label="TRANSAKSIYA ID"
                                        value={selectedLog.transactionId || "YO'Q"}
                                        canCopy={!!selectedLog.transactionId}
                                        onCopy={() => copyToClipboard(selectedLog.transactionId || '')}
                                    />
                                    <DetailItem
                                        icon={<Activity size={16} />}
                                        label="IP MANZIL (CLIENT)"
                                        value={selectedLog.ipAddress || "MA'LUMOT YO'Q"}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <div className="flex items-center gap-2">
                                            <Terminal size={14} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Server Payload</span>
                                        </div>
                                        {selectedLog.requestData && (
                                            <button
                                                onClick={() => copyToClipboard(selectedLog.requestData!)}
                                                className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
                                            >
                                                <Copy size={10} /> Nusxa olish
                                            </button>
                                        )}
                                    </div>
                                    <pre className="bg-[#0f172a] p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[250px] leading-relaxed">
                                        {formatPayload(selectedLog.requestData)}
                                    </pre>
                                </div>

                                {selectedLog.responseData && (
                                    <div className="space-y-2 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                                        <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Tizim Metadata</span>
                                        <div className="text-[11px] font-mono text-blue-700 break-all leading-relaxed">
                                            {selectedLog.responseData}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                            <div className="flex flex-col items-center">
                                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100 mb-4">
                                    <PieChart size={24} />
                                </div>
                                <h3 className="text-base font-black text-gray-900 tracking-tight uppercase">Tanlov kutilmoqda</h3>
                                <p className="text-gray-400 text-xs mt-2 leading-relaxed max-w-[200px] font-medium">
                                    Batafsil ma'lumotni ko'rish uchun chapdagi ro'yxatdan tranzaksiyani tanlang.
                                </p>
                            </div>
                        </div>
                    )}
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
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-lg font-black text-gray-900 mt-0.5 tabular-nums tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function DetailItem({ icon, label, value, canCopy, onCopy }: { icon: any, label: string, value: string, canCopy?: boolean, onCopy?: () => void }) {
    return (
        <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-50 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-blue-500">{icon}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                </div>
                {canCopy && (
                    <button onClick={onCopy} className="p-1 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500" aria-label="Nusxa olish">
                        <Copy size={12} />
                    </button>
                )}
            </div>
            <div className={`text-xs font-black break-all leading-relaxed ${canCopy ? 'text-blue-600 bg-white p-2 rounded-lg border border-blue-50' : 'text-gray-700'}`}>
                {value}
            </div>
        </div>
    );
}
