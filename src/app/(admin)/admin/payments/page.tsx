"use client";

import { useState } from "react";
import {
    Plus, Trash2, CreditCard, Save, X, Settings, List,
    CheckCircle2, AlertCircle, Search, ExternalLink,
    ChevronRight, Wallet, BadgeCheck, Loader2, Copy,
    Info, HelpCircle, Laptop, Landmark, Banknote
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface PaymentMethod {
    id: string;
    name: string;
    type: string;
    provider: string;
    details?: string;
    config?: string;
    isActive: boolean;
}

const PROVIDER_CONFIG: Record<string, { color: string, iconColor: string, bg: string, label: string, guide: string }> = {
    'CLICK': {
        color: 'bg-[#0085db]',
        iconColor: 'text-[#0085db]',
        bg: 'bg-[#0085db]/10',
        label: 'CLICK',
        guide: 'CLICK Merchant ID va Service ID ma\'lumotlarini CLICK Merchant interfeysidan oling.'
    },
    'PAYME': {
        color: 'bg-[#00c1af]',
        iconColor: 'text-[#00c1af]',
        bg: 'bg-[#00c1af]/10',
        label: 'Payme',
        guide: 'Payme Business interfeysidan ID va Key kalitlarini JSON formatida kiriting.'
    },
    'UZUM': {
        color: 'bg-[#7000ff]',
        iconColor: 'text-[#7000ff]',
        bg: 'bg-[#7000ff]/10',
        label: 'Uzum',
        guide: 'Uzum Business (Apelsin) API sozlamalarini bu yerda saqlang.'
    },
    'CASH': {
        color: 'bg-emerald-500',
        iconColor: 'text-emerald-500',
        bg: 'bg-emerald-50',
        label: 'Naqd',
        guide: 'Do\'konning o\'zida terminal yoki naqd pul orqali to\'lov.'
    },
    'CARD': {
        color: 'bg-blue-500',
        iconColor: 'text-blue-500',
        bg: 'bg-blue-50',
        label: 'Karta P2P',
        guide: 'Mijoz to\'lovini faqat karta raqamiga o\'tkazish orqali qabul qilish.'
    },
};

export default function PaymentMethodsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        type: "MERCHANT",
        provider: "CLICK",
        details: "",
        config: "",
        isActive: true
    });

    // Fetch Payment Methods
    const { data: methods, isLoading } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: async () => {
            const res = await fetch('/api/admin/payment-methods');
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json() as Promise<PaymentMethod[]>;
        }
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/admin/payment-methods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("Tizim muvaffaqiyatli qo'shildi");
            setIsModalOpen(false);
        },
        onError: (err) => toast.error("Xatolik: " + err.message)
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/admin/payment-methods', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("Ma'lumotlar yangilandi");
            setIsModalOpen(false);
        },
        onError: (err) => toast.error("Xatolik: " + err.message)
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/payment-methods?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("Tizim o'chirib tashlandi");
        }
    });

    const handleOpenModal = (method?: PaymentMethod) => {
        if (method) {
            setEditingMethod(method);
            setFormData({
                name: method.name,
                type: method.type,
                provider: method.provider,
                details: method.details || "",
                config: method.config || "",
                isActive: method.isActive
            });
        } else {
            setEditingMethod(null);
            setFormData({ name: "", type: "MERCHANT", provider: "CLICK", details: "", config: "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Nom kiritilishi shart!");

        if (editingMethod) {
            await updateMutation.mutateAsync({ ...formData, id: editingMethod.id });
        } else {
            await createMutation.mutateAsync(formData);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Nusxa olindi: " + text);
    };

    const filteredMethods = methods?.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-gray-400 font-medium animate-pulse">Platforma sozlamalari yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">To'lov Tizimlari</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {['CLICK', 'PAYME', 'UZUM'].map((p, i) => (
                                <div key={p} className={`w-6 h-6 rounded-full border-2 border-white ${PROVIDER_CONFIG[p].color} flex items-center justify-center text-[8px] text-white font-bold z-[${3 - i}]`}>
                                    {p[0]}
                                </div>
                            ))}
                        </div>
                        <p className="text-gray-500 text-sm font-medium ml-2">Integratsiya va tranzaksiyalar boshqaruvi</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/payments/logs">
                        <Button variant="outline" className="gap-2 border-gray-200 bg-white/80 hover:bg-white rounded-2xl h-12 shadow-sm font-bold">
                            <List size={18} /> Audit Jurnali
                        </Button>
                    </Link>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 shadow-xl shadow-blue-200/50 transition-all active:scale-95 px-6 font-black tracking-tight"
                    >
                        <Plus size={20} /> YANGI TIZIM
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Grid */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatBox label="JAMI METODLAR" value={methods?.length || 0} icon={<Wallet />} color="blue" />
                    <StatBox label="FAOL HOLATDA" value={methods?.filter(m => m.isActive).length || 0} icon={<CheckCircle2 />} color="emerald" />
                    <StatBox label="O'CHIRILGAN" value={methods?.filter(m => !m.isActive).length || 0} icon={<X />} color="gray" />
                    <StatBox label="INTEGRATSIYA" value="Tayyor" icon={<BadgeCheck />} color="indigo" />
                </div>

                {/* Search and List */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="relative group max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Metod nomi yoki provider bo'yicha qidirish..."
                            className="w-full pl-11 pr-4 py-4 bg-white/80 backdrop-blur border border-gray-100 rounded-[24px] shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-gray-900 italic"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {filteredMethods?.map((method, index) => (
                            <motion.div
                                key={method.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="group bg-white rounded-[40px] border border-gray-100 p-8 hover:shadow-2xl hover:shadow-blue-900/10 transition-all relative overflow-hidden flex flex-col justify-between"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

                                <div className="relative space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className={`w-16 h-16 rounded-[24px] ${PROVIDER_CONFIG[method.provider]?.bg || 'bg-gray-50'} flex items-center justify-center ${PROVIDER_CONFIG[method.provider]?.iconColor || 'text-gray-400'} shadow-lg shadow-gray-200/20 group-hover:rotate-6 transition-transform`}>
                                            {method.provider === 'CASH' ? <Banknote size={32} /> :
                                                method.provider === 'CARD' ? <Landmark size={32} /> : <CreditCard size={32} />}
                                        </div>
                                        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${method.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                            {method.isActive ? 'ONLINE' : 'OFFLINE'}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{method.name}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`w-2 h-2 rounded-full ${method.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{method.provider}</span>
                                            <span className="text-[10px] font-black text-gray-300">•</span>
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{method.type}</span>
                                        </div>
                                    </div>

                                    {method.details && (
                                        <div className="relative group/detail">
                                            <div className="text-xs font-bold text-gray-500 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 break-all pr-10 italic">
                                                {method.details}
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(method.details!)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg opacity-0 group-hover/detail:opacity-100 transition-all text-gray-400 hover:text-blue-500"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-10 flex items-center gap-3">
                                    <Button
                                        onClick={() => handleOpenModal(method)}
                                        variant="outline"
                                        className="flex-1 rounded-2xl h-14 border-gray-100 bg-gray-50/50 hover:bg-blue-600 hover:text-white font-black uppercase tracking-widest gap-2 group/edit transition-all shadow-sm"
                                    >
                                        <Settings size={18} className="group-hover/edit:rotate-180 transition-transform duration-500 text-gray-400 group-hover:text-white" />
                                        Sozlash
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (confirm("Haqiqatan ham o'chirmoqchimisiz?")) deleteMutation.mutate(method.id);
                                        }}
                                        variant="ghost"
                                        className="rounded-2xl h-14 w-14 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                    >
                                        <Trash2 size={20} />
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {filteredMethods?.length === 0 && (
                        <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 mb-6">
                                <Search size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">Natija topilmadi</h3>
                            <p className="text-gray-400 mt-2 max-w-xs mx-auto text-sm font-medium leading-relaxed">Qidiruv mezonlarini o'zgartiring yoki yangi to'lov metodini ro'yxatdan o'tkazing.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-white rounded-[48px] w-full max-w-2xl p-8 md:p-12 relative shadow-2xl overflow-hidden flex flex-col md:flex-row gap-10"
                        >
                            {/* Left Side: Guide */}
                            <div className="md:w-1/3 space-y-6 border-r border-gray-100 pr-0 md:pr-10 hidden md:block">
                                <div className={`w-16 h-16 rounded-3xl ${PROVIDER_CONFIG[formData.provider]?.bg || 'bg-blue-50'} flex items-center justify-center ${PROVIDER_CONFIG[formData.provider]?.iconColor || 'text-blue-500'} mb-6 shadow-inner`}>
                                    <Info size={32} />
                                </div>
                                <h4 className="text-lg font-black text-gray-900 leading-tight">Qo'llanma: {formData.provider}</h4>
                                <p className="text-sm font-medium text-gray-500 leading-relaxed italic">
                                    {PROVIDER_CONFIG[formData.provider]?.guide || "Ushbu to'lov tizimini sozlash uchun kerakli ma'lumotlarni kiriting."}
                                </p>
                                <div className="p-5 bg-blue-50/50 rounded-2xl space-y-3">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <span className="text-xs font-bold text-blue-900 italic">Konfiguratsiyada...</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Form */}
                            <div className="flex-1 space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">
                                            {editingMethod ? "Tahrirlash" : "Ro'yxatga olish"}
                                        </h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Metod parametrlarini sozlash</p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all md:hidden">
                                        <X size={24} className="text-gray-400" />
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ekranda ko'rinuvchi nom</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Masalan: Karta orqali to'lash"
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-black text-gray-900 italic text-lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tizim (Provider)</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.provider}
                                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-black text-gray-900 appearance-none italic"
                                                >
                                                    <option value="CLICK">CLICK</option>
                                                    <option value="PAYME">PAYME</option>
                                                    <option value="UZUM">UZUM</option>
                                                    <option value="CASH">NAQD PUL</option>
                                                    <option value="CARD">KARTA (P2P)</option>
                                                </select>
                                                <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ulanish turi</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.type}
                                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-black text-gray-900 appearance-none italic"
                                                >
                                                    <option value="MERCHANT">API MERCHANT</option>
                                                    <option value="P2P">P2P TRANSFER</option>
                                                    <option value="OFFLINE">OFFLINE (NAQD)</option>
                                                </select>
                                                <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                                            <span>Raqam / Details</span>
                                            {formData.provider === 'CARD' && <span className={`text-[9px] px-2 py-0.5 rounded ${formData.details?.length === 16 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>{formData.details?.length || 0}/16</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.details}
                                            onChange={e => {
                                                let val = e.target.value;
                                                if (formData.provider === 'CARD') val = val.replace(/\D/g, '').slice(0, 16);
                                                setFormData({ ...formData, details: val });
                                            }}
                                            placeholder={formData.provider === 'CARD' ? "8600 ...." : "Mijozga ko'rinuvchi qo'shimcha ma'lumot"}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-[20px] outline-none transition-all font-bold placeholder:font-medium italic"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 ml-1">
                                            <Laptop size={14} className="text-gray-400" />
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">JSON Konfiguratsiya (Maxfiy)</label>
                                        </div>
                                        <textarea
                                            value={formData.config}
                                            onChange={e => setFormData({ ...formData, config: e.target.value })}
                                            placeholder='{"service_id": "...", "merchant_id": "..."}'
                                            className="w-full bg-[#0f172a] border-2 border-transparent focus:border-blue-500 p-4 rounded-[24px] outline-none transition-all font-mono text-[11px] text-emerald-400 min-h-[100px] shadow-inner"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-[20px] border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${formData.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-gray-300'}`} />
                                            <span className="text-xs font-black text-gray-900 uppercase italic tracking-tighter">{formData.isActive ? "Tizim hozirda ochiq" : "Tizim vaqtincha yopiq"}</span>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="w-full bg-gray-900 border-b-4 border-gray-950 hover:bg-black text-white h-16 rounded-[24px] font-black text-lg gap-3 shadow-2xl transition-all active:translate-y-1 active:border-b-0 mt-2 uppercase tracking-tight italic"
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="animate-spin" />
                                                <span>JARAYONDA...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Save size={24} />
                                                MA'LUMOTLARNI SAQLASH
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatBox({ label, value, icon, color }: { label: string, value: any, icon: any, color: 'blue' | 'emerald' | 'gray' | 'indigo' }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/10',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10',
        gray: 'bg-gray-50 text-gray-500 border-gray-100 shadow-gray-500/10',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/10',
    };

    return (
        <div className="bg-white p-7 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden">
            <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-150 transition-transform duration-700 text-black`}>
                {icon}
            </div>
            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center border-2 ${colors[color]} shadow-xl group-hover:rotate-12 transition-all duration-500`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">{label}</p>
                <p className="text-3xl font-black text-gray-900 mt-0.5 tracking-tight italic">{value}</p>
            </div>
        </div>
    );
}
