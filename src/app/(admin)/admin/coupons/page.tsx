"use client";

import { useState, useEffect } from "react";
import {
    Ticket, Plus, Trash2, Edit2, Loader2,
    CheckCircle2, XCircle, Search, Calendar,
    ChevronDown, ChevronUp, Tag
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Coupon {
    id: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minAmount: number;
    startDate: string;
    expiryDate: string;
    usageLimit: number;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
}

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        code: "",
        discountType: "PERCENTAGE" as 'PERCENTAGE' | 'FIXED',
        discountValue: 0,
        minAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: "",
        usageLimit: 1,
        isActive: true
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/coupons');
            const data = await res.json();
            if (Array.isArray(data)) {
                setCoupons(data);
            }
        } catch (error) {
            toast.error("Kuponlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingCoupon ? `/api/admin/coupons/${editingCoupon.id}` : '/api/admin/coupons';
        const method = editingCoupon ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(editingCoupon ? "Kupon yangilandi" : "Kupon yaratildi");
                setIsAddModalOpen(false);
                setEditingCoupon(null);
                resetForm();
                fetchCoupons();
            } else {
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Xatolik yuz berdi");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Haqiqatdan ham ushbu kuponni o'chirmoqchimisiz?")) return;

        try {
            const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Kupon o'chirildi");
                fetchCoupons();
            }
        } catch (error) {
            toast.error("O'chirishda xatolik");
        }
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minAmount: coupon.minAmount,
            startDate: coupon.startDate.split('T')[0],
            expiryDate: coupon.expiryDate.split('T')[0],
            usageLimit: coupon.usageLimit,
            isActive: coupon.isActive
        });
        setIsAddModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            code: "",
            discountType: "PERCENTAGE",
            discountValue: 0,
            minAmount: 0,
            startDate: new Date().toISOString().split('T')[0],
            expiryDate: "",
            usageLimit: 1,
            isActive: true
        });
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <Ticket className="text-blue-600" />
                        Kuponlar boshqaruvi
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Promokodlarni yaratish va tahrirlash</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCoupon(null);
                        resetForm();
                        setIsAddModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <Plus size={20} />
                    Yangi kupon
                </button>
            </div>

            {/* Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Ticket size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{coupons.length}</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jami kuponlar</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-slate-900">{coupons.filter(c => c.isActive).length}</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faol kuponlar</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Kupon kodini qidiring..."
                        className="w-full h-full pl-12 pr-4 bg-transparent outline-none font-bold text-slate-700 placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-wider">Kupon kodi</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-wider">Chegirma</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-wider">Muddat</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-wider">Ishlatildi</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-wider">Holati</th>
                                <th className="px-6 py-5 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Loader2 className="animate-spin inline-block text-blue-600" size={40} />
                                    </td>
                                </tr>
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold">
                                        Kuponlar topilmadi
                                    </td>
                                </tr>
                            ) : filteredCoupons.map((coupon) => (
                                <tr key={coupon.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                                {coupon.code[0]}
                                            </div>
                                            <span className="font-black text-slate-900 text-lg uppercase">{coupon.code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm">
                                            <Tag size={14} />
                                            {coupon.discountValue}{coupon.discountType === 'PERCENTAGE' ? '%' : " so'm"}
                                        </div>
                                        {coupon.minAmount > 0 && (
                                            <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                                                Min: {coupon.minAmount.toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-bold text-slate-700">
                                            {new Date(coupon.expiryDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                                            {new Date(coupon.expiryDate) < new Date() ? "Muddati tugagan" : "Amal qilmoqda"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="w-full max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                            <div
                                                className="h-full bg-blue-600 rounded-full"
                                                style={{ width: `${Math.min((coupon.usedCount / coupon.usageLimit) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs font-bold text-slate-600">
                                            {coupon.usedCount} / {coupon.usageLimit}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {coupon.isActive ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-black uppercase">
                                                <CheckCircle2 size={14} /> Faol
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-500 text-xs font-black uppercase">
                                                <XCircle size={14} /> No-faol
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(coupon)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(coupon.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden relative shadow-2xl"
                        >
                            <form onSubmit={handleSubmit}>
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-xl font-black text-slate-900">
                                        {editingCoupon ? "Kuponni tahrirlash" : "Yangi kupon yaratish"}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kupon kodi</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 uppercase"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            placeholder="MASALAN: RAMAZON20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Chegirma turi</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 appearance-none cursor-pointer"
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                                        >
                                            <option value="PERCENTAGE">Foiz (%)</option>
                                            <option value="FIXED">Summa (so'm)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Chegirma miqdori</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900"
                                            value={formData.discountValue === 0 ? "" : formData.discountValue}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value === "" ? 0 : Number(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Minimal buyurtma</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900"
                                            value={formData.minAmount === 0 ? "" : formData.minAmount}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setFormData({ ...formData, minAmount: e.target.value === "" ? 0 : Number(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Ishlatish limiti</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900"
                                            value={formData.usageLimit === 0 ? "" : formData.usageLimit}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value === "" ? 0 : Number(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Boshlanish sanasi</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tugash sanasi</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="date"
                                                required
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900"
                                                value={formData.expiryDate}
                                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-6 h-6 rounded-lg accent-blue-600"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            />
                                            <span className="font-bold text-slate-700">Kupon hozirda faol bo'lsin</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                    >
                                        {editingCoupon ? "Saqlash" : "Yaratish"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
