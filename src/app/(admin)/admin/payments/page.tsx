"use client";

import { useState, useEffect } from "react";
import {
    Plus, Trash2, CreditCard, Save, X, Settings, List,
    CheckCircle2, Search,
    Info, Laptop, Landmark, Banknote, Copy, ChevronRight, Wallet, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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

const PROVIDER_GUIDE: Record<string, string> = {
    'CLICK': "CLICK uchun Service ID, Merchant ID va SECRET KEY kerak. Uchtasi ham CLICK Merchant kabinetida (my.click.uz) bo'ladi. Secret Key kiritilmasa to'lov tasdiqlanmaydi.",
    'PAYME': "Payme Business interfeysidan ID va Key kalitlarini JSON formatida kiriting.",
    'UZUM': "Uzum Business (Apelsin) API sozlamalarini bu yerda saqlang.",
    'CASH': "Do'konning o'zida terminal yoki naqd pul orqali to'lov.",
    'CARD': "Mijoz to'lovini faqat karta raqamiga o'tkazish orqali qabul qilish.",
};

/** JSON config talab qiladigan providerlar */
const CONFIG_PROVIDERS = ['CLICK', 'PAYME', 'UZUM'];

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

    // Modal ochilganda orqa fon scroll'ni bloklash
    useEffect(() => {
        if (!isModalOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsModalOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [isModalOpen]);

    const { data: methods, isLoading } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: async () => {
            const res = await fetch('/api/admin/payment-methods');
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json() as Promise<PaymentMethod[]>;
        }
    });

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

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/payment-methods?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("Tizim o'chirib tashlandi");
        },
        onError: () => toast.error("O'chirishda xatolik")
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
        if (!formData.name.trim()) { toast.error("Nom kiritilishi shart!"); return; }

        // JSON config talab qiladigan providerlar uchun validatsiya
        if (CONFIG_PROVIDERS.includes(formData.provider) && formData.config.trim()) {
            try {
                JSON.parse(formData.config);
            } catch {
                toast.error("JSON formati noto'g'ri");
                return;
            }
        }

        try {
            if (editingMethod) {
                await updateMutation.mutateAsync({ ...formData, id: editingMethod.id });
            } else {
                await createMutation.mutateAsync(formData);
            }
        } catch { /* toast in mutation */ }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Nusxa olindi");
    };

    const filteredMethods = methods?.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-gray-400 font-medium">Platforma sozlamalari yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="p-5 space-y-4 bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1">
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">To'lov Tizimlari</h1>
                    <p className="text-gray-500 text-sm font-medium">Integratsiya va tranzaksiyalar boshqaruvi</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/payments/logs">
                        <Button variant="outline" className="gap-2 border-gray-200 bg-white hover:bg-gray-50 rounded-xl h-10 shadow-sm font-bold">
                            <List size={16} /> Audit Jurnali
                        </Button>
                    </Link>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 shadow-md px-4 font-black tracking-tight"
                    >
                        <Plus size={18} /> YANGI TIZIM
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="JAMI METODLAR" value={methods?.length || 0} icon={<Wallet />} color="blue" />
                <StatBox label="FAOL HOLATDA" value={methods?.filter(m => m.isActive).length || 0} icon={<CheckCircle2 />} color="emerald" />
                <StatBox label="YOPIQ HOLATDA" value={methods?.filter(m => !m.isActive).length || 0} icon={<X />} color="gray" />
                <StatBox label="INTEGRATSIYA" value="Tayyor" icon={<CheckCircle2 />} color="indigo" />
            </div>

            {/* Search */}
            <div className="relative group max-w-md">
                <label htmlFor="payment-search" className="sr-only">To'lov tizimlarini qidirish</label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                    id="payment-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Metod nomi yoki provider bo'yicha qidirish..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-gray-900"
                    aria-label="Metod nomi yoki provider bo'yicha qidirish"
                />
            </div>

            {/* Method Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMethods?.map((method) => (
                    <div key={method.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-blue-500 border border-gray-100">
                                    {method.provider === 'CASH' ? <Banknote size={20} /> :
                                        method.provider === 'CARD' ? <Landmark size={20} /> : <CreditCard size={20} />}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${method.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                    {method.isActive ? 'ONLINE' : 'OFFLINE'}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">{method.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{method.provider}</span>
                                    <span className="text-[10px] font-black text-gray-300">•</span>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{method.type}</span>
                                </div>
                            </div>

                            {method.details && (
                                <div className="relative group/detail">
                                    <div className="text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 break-all pr-10">
                                        {method.details}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(method.details!)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-500"
                                        aria-label="Nusxa olish"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <Button
                                onClick={() => handleOpenModal(method)}
                                variant="outline"
                                className="flex-1 rounded-xl h-10 border-gray-100 bg-gray-50 hover:bg-gray-100 font-black uppercase tracking-widest gap-2"
                            >
                                <Settings size={16} />
                                Sozlash
                            </Button>
                            <Button
                                onClick={() => {
                                    if (confirm("Haqiqatan ham o'chirmoqchimisiz?")) deleteMutation.mutate(method.id);
                                }}
                                variant="ghost"
                                className="rounded-xl h-10 w-10 text-gray-300 hover:text-red-500 hover:bg-red-50"
                                title="O'chirish"
                                aria-label={`${method.name} tizimini o'chirish`}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredMethods?.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 mb-4">
                        <Search size={24} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Natija topilmadi</h3>
                    <p className="text-gray-400 mt-1 max-w-xs mx-auto text-sm font-medium leading-relaxed">Qidiruv mezonlarini o'zgartiring yoki yangi to'lov metodini ro'yxatdan o'tkazing.</p>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-gray-900/80" />
                    <div className="bg-white rounded-2xl w-full max-w-md p-5 md:p-6 relative shadow-2xl flex flex-col md:flex-row gap-4 max-h-[90vh] overflow-y-auto">
                        {/* Guide */}
                        <div className="md:w-1/3 space-y-4 border-r border-gray-100 pr-0 md:pr-6 hidden md:block">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
                                <Info size={20} />
                            </div>
                            <h4 className="text-base font-black text-gray-900 leading-tight">Qo'llanma: {formData.provider}</h4>
                            <p className="text-xs font-medium text-gray-500 leading-relaxed">
                                {PROVIDER_GUIDE[formData.provider] || "Ushbu to'lov tizimini sozlash uchun kerakli ma'lumotlarni kiriting."}
                            </p>
                        </div>

                        {/* Form */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                        {editingMethod ? "Tahrirlash" : "Ro'yxatga olish"}
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Metod parametrlarini sozlash</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-xl md:hidden" aria-label="Yopish">
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="method-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ekranda ko'rinuvchi nom</label>
                                    <input
                                        id="method-name"
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Masalan: Karta orqali to'lash"
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3 rounded-xl outline-none font-black text-gray-900 text-base"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="method-provider" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tizim (Provider)</label>
                                        <div className="relative">
                                            <select
                                                id="method-provider"
                                                value={formData.provider}
                                                onChange={e => {
                                                    // Provider almashtirilganda eski provider'ning maxfiy configi o'tib qolmasin
                                                    const hadConfig = CONFIG_PROVIDERS.includes(formData.provider);
                                                    const needsConfig = CONFIG_PROVIDERS.includes(e.target.value);
                                                    setFormData({
                                                        ...formData,
                                                        provider: e.target.value,
                                                        config: hadConfig && !needsConfig ? "" : formData.config,
                                                    });
                                                }}
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3 rounded-xl outline-none font-black text-gray-900 appearance-none"
                                            >
                                                <option value="CLICK">CLICK</option>
                                                <option value="PAYME">PAYME</option>
                                                <option value="UZUM">UZUM</option>
                                                <option value="CASH">NAQD PUL</option>
                                                <option value="CARD">KARTA (P2P)</option>
                                            </select>
                                            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="method-type" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ulanish turi</label>
                                        <div className="relative">
                                            <select
                                                id="method-type"
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3 rounded-xl outline-none font-black text-gray-900 appearance-none"
                                            >
                                                <option value="MERCHANT">API MERCHANT</option>
                                                <option value="P2P">P2P TRANSFER</option>
                                                <option value="OFFLINE">OFFLINE (NAQD)</option>
                                            </select>
                                            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="method-details" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                                        <span>Raqam / Details</span>
                                        {formData.provider === 'CARD' && <span className={`text-[9px] px-2 py-0.5 rounded ${formData.details?.length === 16 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>{formData.details?.length || 0}/16</span>}
                                    </label>
                                    <input
                                        id="method-details"
                                        type="text"
                                        value={formData.details}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (formData.provider === 'CARD') val = val.replace(/\D/g, '').slice(0, 16);
                                            setFormData({ ...formData, details: val });
                                        }}
                                        placeholder={formData.provider === 'CARD' ? "8600 ...." : "Mijozga ko'rinuvchi qo'shimcha ma'lumot"}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-3 rounded-xl outline-none font-bold"
                                    />
                                </div>

                                {CONFIG_PROVIDERS.includes(formData.provider) && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 ml-1">
                                            <Laptop size={14} className="text-gray-400" />
                                            <label htmlFor="method-config" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">JSON Konfiguratsiya (Maxfiy)</label>
                                        </div>
                                        <textarea
                                            id="method-config"
                                            value={formData.config}
                                            onChange={e => setFormData({ ...formData, config: e.target.value })}
                                            placeholder={formData.provider === 'CLICK'
                                                ? '{"service_id": "...", "merchant_id": "...", "secret_key": "..."}'
                                                : formData.provider === 'PAYME'
                                                ? '{"merchant": "...", "login": "...", "key": "...", "test_key": "..."}'
                                                : '{"merchant_id": "...", "key": "..."}'}
                                            className="w-full bg-[#0f172a] border-2 border-transparent focus:border-blue-500 p-3 rounded-xl outline-none font-mono text-[11px] text-emerald-400 min-h-[80px]"
                                        />
                                        <p className="text-[10px] text-gray-400 ml-1">Maxfiy kalitlar faqat serverda ishlatiladi, mijozga ko'rinmaydi.</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{formData.isActive ? "Tizim hozirda ochiq" : "Tizim vaqtincha yopiq"}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={`w-11 h-6 rounded-full p-1 transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                        title={formData.isActive ? "Tizimni o'chirish" : "Tizimni yoqish"}
                                        aria-label={formData.isActive ? "Tizimni o'chirish" : "Tizimni yoqish"}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <Button
                                    onClick={handleSave}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="w-full bg-gray-900 hover:bg-black text-white h-11 rounded-xl font-black text-sm gap-2.5 shadow-lg mt-2 uppercase tracking-tight"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>JARAYONDA...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            MA'LUMOTLARNI SAQLASH
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, icon, color }: { label: string, value: any, icon: any, color: 'blue' | 'emerald' | 'gray' | 'indigo' }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        gray: 'bg-gray-50 text-gray-500 border-gray-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    };

    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-lg font-black text-gray-900 mt-0.5 tracking-tight">{value}</p>
            </div>
        </div>
    );
}
