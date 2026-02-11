
"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Save, Loader2, Truck, Plus, Trash2, Edit2, CheckCircle, XCircle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { regions, districts } from '@/constants/locations';

export default function AdminShippingPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [zones, setZones] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingZone, setEditingZone] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        district: '',
        price: '',
        freeFrom: '',
        freeFromQty: '',
        freeIfHasDiscount: false,
        freeDiscountType: 'ANY',
        isActive: true
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            const res = await fetch('/api/admin/shipping');
            if (res.ok) {
                const data = await res.json();
                setZones(data);
            }
        } catch (e) {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (zone: any = null) => {
        if (zone) {
            setEditingZone(zone);
            setFormData({
                name: zone.name,
                district: zone.district || '',
                price: zone.price.toString(),
                freeFrom: zone.freeFrom?.toString() || '',
                freeFromQty: zone.freeFromQty?.toString() || '',
                freeIfHasDiscount: zone.freeIfHasDiscount || false,
                freeDiscountType: zone.freeDiscountType || 'ANY',
                isActive: zone.isActive
            });
        } else {
            setEditingZone(null);
            setFormData({
                name: '',
                district: '',
                price: '0',
                freeFrom: '',
                freeFromQty: '',
                freeIfHasDiscount: false,
                freeDiscountType: 'ANY',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingZone ? `/api/admin/shipping/${editingZone.id}` : '/api/admin/shipping';
            const method = editingZone ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editingZone ? "Hudud muvaffaqiyatli yangilandi" : "Yangi hudud qo'shildi");
                setIsModalOpen(false);
                fetchZones();
            } else {
                let errorMessage = "Xatolik yuz berdi";
                let errorData = null;
                try {
                    const text = await res.text();
                    try {
                        errorData = JSON.parse(text);
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        errorMessage = text || errorMessage;
                    }
                } catch (e) {
                    errorMessage = "Response could not be read";
                }

                toast.error(errorMessage);
                if (errorData) {
                    toast.error(JSON.stringify(errorData).substring(0, 100)); // Show snippet of raw error
                }
                console.error("Save failed with status:", res.status);
                console.error("Error Message:", errorMessage);
                console.error("Full Error Data:", errorData);
            }
        } catch (e) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Haqiqatan ham bu hududni o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`/api/admin/shipping/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("O'chirildi");
                fetchZones();
            }
        } catch (e) {
            toast.error("O'chirishda xatolik");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-gray-400 font-medium animate-pulse">Yuklanmoqda...</p>
        </div>
    );

    return (
        <div className="space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Yetkazib Berish Narxlari</h1>
                    <p className="text-gray-500 text-sm font-medium">Hududlar bo'yicha yetkazib berish narxlarini sozlash</p>
                </div>
                <Button
                    onClick={() => handleOpenModal()}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 shadow-xl shadow-blue-100 transition-all active:scale-95 px-8 font-bold"
                >
                    <Plus size={20} /> Hudud qo'shish
                </Button>
            </div>

            {/* Zones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map((zone) => (
                    <motion.div
                        key={zone.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm group hover:shadow-md transition-all relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${zone.isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}>
                                <Truck size={24} />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(zone)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(zone.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                    {zone.name} {zone.district && <span className="text-sm font-normal text-gray-400 capitalize">/ {zone.district}</span>}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${zone.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {zone.isActive ? "Faol" : "Faol emas"}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center group-hover:bg-blue-50 transition-colors">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Narxi:</span>
                                <span className="text-lg font-black text-gray-900">{zone.price.toLocaleString()} so'm</span>
                            </div>

                            {zone.freeFrom && (
                                <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                                    <CheckCircle size={14} /> {zone.freeFrom.toLocaleString()} so'mdan yuqori xarid bepul
                                </p>
                            )}

                            {zone.freeFromQty && (
                                <p className="text-xs font-medium text-purple-600 flex items-center gap-1.5">
                                    <CheckCircle size={14} /> {zone.freeFromQty} ta mahsulot bo'lsa bepul
                                </p>
                            )}

                            {zone.freeIfHasDiscount && (
                                <p className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
                                    <CheckCircle size={14} /> Chegirmali mahsulot bo'lsa bepul
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {zones.length === 0 && (
                <div className="bg-white rounded-[32px] border border-dashed border-gray-200 p-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                        <Truck size={32} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-gray-900">Hududlar topilmadi</h4>
                        <p className="text-gray-400 text-sm">Yangi hudud qo'shish uchun yuqoridagi tugmani bosing</p>
                    </div>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl space-y-8"
                        >
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                    {editingZone ? "Hududni tahrirlash" : "Yangi hudud qo'shish"}
                                </h3>
                                <p className="text-gray-400 text-sm font-medium">Barcha ma'lumotlarni to'g'ri kiriting</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Viloyat / Shahar</label>
                                        <select
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value, district: '' })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-900 appearance-none"
                                        >
                                            <option value="">Tanlang</option>
                                            {regions.map(r => (
                                                <option key={r.id} value={r.name}>{r.name}</option>
                                            ))}
                                            <option value="Boshqa">Boshqa</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tuman / Shahar <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            value={formData.district}
                                            onChange={e => setFormData({ ...formData, district: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-900 appearance-none"
                                            disabled={!formData.name || formData.name === 'Boshqa'}
                                        >
                                            <option value="">Tanlang</option>
                                            {(() => {
                                                const regionId = regions.find(r => r.name === formData.name)?.id;
                                                return regionId ? (districts[regionId] || []).map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                )) : null;
                                            })()}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Narxi (so'm)</label>
                                        <input
                                            type="number"
                                            required
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bepul (so'm)</label>
                                        <input
                                            type="number"
                                            value={formData.freeFrom}
                                            onChange={e => setFormData({ ...formData, freeFrom: e.target.value })}
                                            placeholder="Summa"
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bepul (soni)</label>
                                        <input
                                            type="number"
                                            value={formData.freeFromQty}
                                            onChange={e => setFormData({ ...formData, freeFromQty: e.target.value })}
                                            placeholder="Soni"
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chegirmali bo'lsa bepul</label>
                                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl cursor-pointer" onClick={() => setFormData({ ...formData, freeIfHasDiscount: !formData.freeIfHasDiscount })}>
                                            <div className={`w-12 h-6 rounded-full transition-all relative ${formData.freeIfHasDiscount ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.freeIfHasDiscount ? 'right-1' : 'left-1'}`}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{formData.freeIfHasDiscount ? "Yoqilgan" : "O'chirilgan"}</span>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {formData.freeIfHasDiscount && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="space-y-2"
                                            >
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chegirma turi</label>
                                                <select
                                                    value={formData.freeDiscountType}
                                                    onChange={e => setFormData({ ...formData, freeDiscountType: e.target.value })}
                                                    className="w-full bg-blue-50 border-2 border-transparent focus:border-blue-500 p-4 rounded-2xl outline-none transition-all font-bold text-blue-900 appearance-none"
                                                >
                                                    <option value="ANY">Har qanday (Sale/Promo)</option>
                                                    <option value="SALE">Faqat Aksiya (Sale)</option>
                                                    <option value="PROMO">Faqat Promo (Promo)</option>
                                                    <option value="HOT">Faqat Qaynoq (Hot)</option>
                                                </select>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl cursor-pointer" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}>
                                    <div className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Hududni faollashtirish</span>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 h-16 rounded-[24px] bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all uppercase tracking-tight"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[2] h-16 rounded-[24px] bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tight"
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                        {editingZone ? "Saqlash" : "Hudud Qo'shish"}
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
