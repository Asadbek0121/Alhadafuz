"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Users, Search, Truck, Navigation, Star, Phone, CreditCard, ChevronLeft, ChevronRight, LayoutGrid, CheckCircle2, XCircle, Clock, MapPin, BarChart3, Zap, Wallet, X, Trash2, Edit2, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { regions, districts } from '@/constants/locations';

export default function AdminShippingPage() {
    // Shared State
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'zones' | 'couriers' | 'analytics'>('analytics');

    // Zones State
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

    // Couriers State
    const [couriers, setCouriers] = useState<any[]>([]);
    const [courierLoading, setCourierLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Analytics State
    const [stats, setStats] = useState<any>(null);
    const [heatmap, setHeatmap] = useState<any[]>([]);

    // Dispatch Settings State
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [dispatchSettings, setDispatchSettings] = useState({
        distanceWeight: 0.4,
        ratingWeight: 0.25,
        workloadWeight: 0.2,
        responseWeight: 0.15
    });

    // Applications State
    const [courierApplications, setCourierApplications] = useState<any[]>([]);
    const [showApplicants, setShowApplicants] = useState(false);

    useEffect(() => {
        if (activeTab === 'zones') fetchZones();
        else if (activeTab === 'couriers') fetchCouriers();
        else fetchAnalytics();
    }, [activeTab]);

    const fetchZones = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/shipping');
            if (res.ok) setZones(await res.json());
        } catch (e) { toast.error("Xatolik"); }
        finally { setLoading(false); }
    };

    const fetchCouriers = async () => {
        setCourierLoading(true);
        try {
            const res = await fetch('/api/admin/couriers');
            if (res.ok) setCouriers(await res.json());

            const appRes = await fetch('/api/admin/couriers/applications');
            if (appRes.ok) setCourierApplications(await appRes.json());
        } catch (e) { toast.error("Xatolik"); }
        finally { setCourierLoading(false); }
    };

    const fetchDispatchSettings = async () => {
        try {
            const res = await fetch('/api/admin/dispatch/settings');
            if (res.ok) setDispatchSettings(await res.json());
        } catch (e) { }
    };

    const handleSaveDispatchSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/dispatch/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dispatchSettings)
            });
            if (res.ok) {
                toast.success("Sozlamalar saqlandi");
                setIsDispatchModalOpen(false);
            } else {
                const data = await res.json();
                toast.error(data.error);
            }
        } catch (e) { toast.error("Xatolik"); }
        finally { setSaving(false); }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/analytics/logistics');
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setHeatmap(data.heatmap);
            }
        } catch (e) { toast.error("Xatolik"); }
        finally { setLoading(false); }
    };

    const handleAddCourier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/couriers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailOrPhone: searchQuery })
            });

            if (res.ok) {
                toast.success("Kuryer qo'shildi");
                setSearchQuery('');
                fetchCouriers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Xatolik");
            }
        } catch (e) { toast.error("Xatolik"); }
    };

    const handleRemoveCourier = async (id: string) => {
        if (!confirm("Haqiqatan ham bu foydalanuvchini kuryerlikdan olib tashlamoqchimisiz?")) return;
        try {
            const res = await fetch(`/api/admin/couriers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Kuryer o'chirildi");
                fetchCouriers();
            }
        } catch (e) { toast.error("Xatolik"); }
    };

    const handleApproveApplication = async (id: string, action: string = 'APPROVE') => {
        try {
            const res = await fetch('/api/admin/couriers/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });

            if (res.ok) {
                toast.success(action === 'APPROVE' ? "Kuryer tasdiqlandi" : "Rad etildi");
                fetchCouriers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Xatolik");
            }
        } catch (e) { toast.error("Xatolik"); }
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
                name: '', district: '', price: '0', freeFrom: '', freeFromQty: '',
                freeIfHasDiscount: false, freeDiscountType: 'ANY', isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmitZone = async (e: React.FormEvent) => {
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
                toast.success("Muvaffaqiyatli saqlandi");
                setIsModalOpen(false);
                fetchZones();
            }
        } catch (e) { toast.error("Xatolik"); }
        finally { setSaving(false); }
    };

    const handleDeleteZone = async (id: string) => {
        if (!confirm("O'chirilsinmi?")) return;
        try {
            const res = await fetch(`/api/admin/shipping/${id}`, { method: 'DELETE' });
            if (res.ok) { fetchZones(); toast.success("O'chirildi"); }
        } catch (e) { toast.error("Xatolik"); }
    };

    return (
        <div className="space-y-8 bg-gray-50/30 min-h-screen">
            {/* Header & Tabs */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Truck className="text-blue-600" size={32} />
                            Logistika Ecosystem
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Boshqaruv paneli va real-vaqt tahlillari</p>
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[24px] w-fit overflow-x-auto">
                    {[
                        { id: 'analytics', label: 'Dashboard', icon: <BarChart3 size={16} /> },
                        { id: 'couriers', label: 'Kuryerlar', icon: <Users size={16} /> },
                        { id: 'zones', label: 'Narxlar', icon: <Navigation size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 rounded-[20px] font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'analytics' && (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Umumiy Buyurtmalar', value: stats?.totalOrders || 0, icon: <Truck className="text-blue-500" />, sub: 'Barcha vaqt' },
                            { label: 'Jarayonda', value: stats?.activeOrders || 0, icon: <Zap className="text-amber-500" />, sub: 'Hozir yo\'lda' },
                            { label: "O'rtacha vaqt", value: `${stats?.avgDeliveryTime || 0} min`, icon: <Clock className="text-emerald-500" />, sub: 'Yetkazib berish' },
                            { label: 'Jami Daromad', value: `${(stats?.totalEarnings || 0).toLocaleString()} SO'M`, icon: <Wallet className="text-purple-500" />, sub: 'Logistika' }
                        ].map((card, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-gray-50 rounded-2xl">{card.icon}</div>
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{card.label}</span>
                                </div>
                                <div className="text-2xl font-black text-gray-900">{card.value}</div>
                                <p className="text-[10px] text-gray-400 mt-1 font-bold">{card.sub}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Active Dispatch View */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Real-vaqtda Kuryerlar</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase">Live</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {heatmap && heatmap.length > 0 ? heatmap.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">K</div>
                                            <div>
                                                <div className="font-bold text-sm">Courier ID: {c.userId.slice(-6)}</div>
                                                <div className="text-[10px] text-gray-400">📍 {c.currentLat?.toFixed(4)}, {c.currentLng?.toFixed(4)}</div>
                                            </div>
                                        </div>
                                        <button className="text-blue-600 font-bold text-xs hover:underline">Xaritada ko'rish</button>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-gray-400">Hozirda online kuryerlar yo'q</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-600 rounded-[40px] p-8 text-white space-y-8 relative overflow-hidden">
                            <Zap className="absolute -right-10 -top-10 text-white/10 w-40 h-40 rotate-12" />
                            <h3 className="text-xl font-black uppercase tracking-tight relative z-10">Smart Dispatch</h3>
                            <p className="text-blue-100 text-sm font-medium relative z-10">Tizim avtomatik ravishda eng yaqin va eng yaxshi kuryerni aniqlaydi.</p>

                            <div className="space-y-4 relative z-10">
                                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Algoritm</div>
                                    <div className="text-sm font-bold">Masofa (40%) + Reyting (25%) + Yuklama (20%)</div>
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    fetchDispatchSettings();
                                    setIsDispatchModalOpen(true);
                                }}
                                className="w-full bg-white text-blue-600 hover:bg-blue-50 py-6 rounded-2xl font-black uppercase tracking-widest text-xs relative z-10"
                            >
                                Sozlamalar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'couriers' && (
                <div className="space-y-8">
                    <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Kuryer Qo'shish</h3>
                                <p className="text-gray-500 text-sm font-medium">Foydalanuvchini tizimga kuryer sifatida ulang</p>
                            </div>

                            <div className="flex gap-3">
                                {courierApplications.length > 0 && (
                                    <button
                                        onClick={() => setShowApplicants(!showApplicants)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${showApplicants ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`}
                                    >
                                        <Users size={14} />
                                        Arizalar ({courierApplications.length})
                                    </button>
                                )}
                                <Link
                                    href="/admin/shipping/map"
                                    className="h-14 px-8 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-blue-100"
                                >
                                    <Navigation size={14} />
                                    Live Map
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <form onSubmit={handleAddCourier} className="flex gap-4">
                                <input
                                    required
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Email yoki Telefon"
                                    className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white p-4 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                />
                                <Button type="submit" className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold active:scale-95 transition-all">
                                    <Plus size={20} className="mr-2" /> Qo'shish
                                </Button>
                            </form>

                            <AnimatePresence>
                                {showApplicants && courierApplications.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[32px] shadow-2xl border border-gray-100 p-6 z-[50] space-y-4 origin-top"
                                    >
                                        <div className="flex justify-between items-center px-2">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegramdan kelgan arizalar</h4>
                                            <button onClick={() => setShowApplicants(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                        </div>
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {courierApplications.map((app) => (
                                                <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">{app.name[0].toUpperCase()}</div>
                                                        <div>
                                                            <div className="font-black text-gray-900">{app.name}</div>
                                                            <div className="text-[10px] font-bold text-blue-600 uppercase font-mono">{app.phone}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveApplication(app.id, 'REJECT')}
                                                            className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Rad etish"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveApplication(app.id, 'APPROVE')}
                                                            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <Plus size={14} /> Qo'shish
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest">Kuryer</th>
                                    <th className="py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest">Holat</th>
                                    <th className="py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Balans</th>
                                    <th className="py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {couriers.map((courier) => (
                                    <tr key={courier.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black shadow-sm ring-4 ring-white">
                                                    {courier.name?.[0]?.toUpperCase() || 'K'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                                        {courier.name || "Nomsiz"}
                                                        {courier.courierProfile?.vehicleType === 'CAR' && <Truck size={12} className="text-gray-400" />}
                                                        {courier.courierProfile?.vehicleType === 'MOTO' && <Zap size={12} className="text-orange-400" />}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                                        <span>ID: {courier.id.slice(-6).toUpperCase()}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-0.5 text-amber-500">
                                                            ★ {Number(courier.courierProfile?.rating || 5).toFixed(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit ${courier.courierProfile?.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                                    {courier.courierProfile?.status || 'OFFLINE'}
                                                </span>
                                                <div className="flex items-center gap-2 ml-1">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                                                        {courier.stats?.completed || 0} bitirildi
                                                    </span>
                                                    {courier.stats?.active > 0 && (
                                                        <span className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1 animate-pulse">
                                                            • {courier.stats.active} faol
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <div className="font-extrabold text-gray-900">{(courier.courierProfile?.balance || 0).toLocaleString()} <span className="text-[10px] text-gray-400">UZS</span></div>
                                            <button
                                                disabled={(courier.courierProfile?.balance || 0) <= 0}
                                                onClick={async () => {
                                                    const amount = prompt("To'lov miqdorini kiriting:", courier.courierProfile?.balance);
                                                    if (!amount) return;
                                                    const res = await fetch('/api/admin/couriers/payout', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ courierId: courier.id, amount: Number(amount) })
                                                    });
                                                    if (res.ok) {
                                                        toast.success("To'lov saqlandi");
                                                        fetchCouriers();
                                                    }
                                                }}
                                                className="mt-1 text-[10px] font-black text-blue-600 uppercase hover:underline disabled:opacity-30"
                                            >
                                                To'lash
                                            </button>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleRemoveCourier(courier.id)}
                                                    className="p-3 text-red-100 bg-red-500 rounded-xl transition-all shadow-lg shadow-red-100 active:scale-95"
                                                    title="O'chirish"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'zones' && (
                <div className="space-y-8">
                    <div className="flex justify-end">
                        <Button onClick={() => handleOpenModal()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 shadow-xl shadow-blue-100 transition-all active:scale-95 px-8 font-bold">
                            <Plus size={20} /> Hudud qo'shish
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {zones.map((zone) => (
                            <motion.div
                                key={zone.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-[48px] border border-gray-100 p-10 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-colors ${zone.isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'}`}>
                                        <Truck size={32} />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleOpenModal(zone)}
                                            className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all transform active:scale-90 shadow-sm"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteZone(zone.id)}
                                            className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all transform active:scale-90 shadow-sm"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-blue-600 uppercase tracking-tight leading-tight">
                                        {zone.name} {zone.district && <span className="text-gray-300 font-medium">/ {zone.district}</span>}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${zone.isActive ? 'bg-emerald-500' : 'bg-gray-300'} animate-pulse`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${zone.isActive ? 'text-emerald-500' : 'text-gray-400'}`}>
                                            {zone.isActive ? 'Faol' : 'Nofaol'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 p-7 bg-blue-50/50 rounded-[32px] flex justify-between items-center border border-blue-100/20">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Narxi:</span>
                                    <span className="text-2xl font-black text-gray-900">
                                        {zone.price.toLocaleString()} <span className="text-sm font-bold text-gray-800 lowercase">so'm</span>
                                    </span>
                                </div>

                                <div className="mt-6 space-y-4">
                                    {zone.freeFrom > 0 && (
                                        <div className="flex items-center gap-3 text-emerald-600">
                                            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <span className="text-sm font-bold tracking-tight">{zone.freeFrom.toLocaleString()} so'mdan yuqori xarid bepul</span>
                                        </div>
                                    )}
                                    {zone.freeFromQty > 0 && (
                                        <div className="flex items-center gap-3 text-purple-500">
                                            <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={14} />
                                            </div>
                                            <span className="text-sm font-bold tracking-tight">{zone.freeFromQty} ta mahsulot bo'lsa bepul</span>
                                        </div>
                                    )}
                                    {zone.freeIfHasDiscount && (
                                        <div className="flex items-center gap-3 text-orange-500">
                                            <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                                <Zap size={14} />
                                            </div>
                                            <span className="text-sm font-bold tracking-tight">Aksiya bo'lsa bepul</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isDispatchModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDispatchModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[48px] p-10 shadow-2xl space-y-8 overflow-hidden">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Smart Dispatch Sozlamalari</h3>
                                <p className="text-gray-400 text-xs font-bold font-mono">Algoritm foizlarini kiriting (Jami 1.0 bo'lishi shart)</p>
                            </div>

                            <form onSubmit={handleSaveDispatchSettings} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
                                            <span>Masofa (40% = 0.4)</span>
                                            <span className="text-blue-600">{(dispatchSettings.distanceWeight * 100).toFixed(0)}%</span>
                                        </label>
                                        <input
                                            type="number" step="0.05" min="0" max="1"
                                            value={dispatchSettings.distanceWeight}
                                            onChange={e => setDispatchSettings({ ...dispatchSettings, distanceWeight: Number(e.target.value) })}
                                            className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
                                            <span>Reyting (25% = 0.25)</span>
                                            <span className="text-blue-600">{(dispatchSettings.ratingWeight * 100).toFixed(0)}%</span>
                                        </label>
                                        <input
                                            type="number" step="0.05" min="0" max="1"
                                            value={dispatchSettings.ratingWeight}
                                            onChange={e => setDispatchSettings({ ...dispatchSettings, ratingWeight: Number(e.target.value) })}
                                            className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
                                            <span>Yuklama (20% = 0.2)</span>
                                            <span className="text-blue-600">{(dispatchSettings.workloadWeight * 100).toFixed(0)}%</span>
                                        </label>
                                        <input
                                            type="number" step="0.05" min="0" max="1"
                                            value={dispatchSettings.workloadWeight}
                                            onChange={e => setDispatchSettings({ ...dispatchSettings, workloadWeight: Number(e.target.value) })}
                                            className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
                                            <span>Javob tezligi (15% = 0.15)</span>
                                            <span className="text-blue-600">{(dispatchSettings.responseWeight * 100).toFixed(0)}%</span>
                                        </label>
                                        <input
                                            type="number" step="0.05" min="0" max="1"
                                            value={dispatchSettings.responseWeight}
                                            onChange={e => setDispatchSettings({ ...dispatchSettings, responseWeight: Number(e.target.value) })}
                                            className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex justify-between items-center">
                                    <span className="text-xs font-black text-blue-600 uppercase">Jami:</span>
                                    <span className={`text-sm font-black ${(dispatchSettings.distanceWeight + dispatchSettings.ratingWeight + dispatchSettings.workloadWeight + dispatchSettings.responseWeight).toFixed(2) === '1.00' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {((dispatchSettings.distanceWeight + dispatchSettings.ratingWeight + dispatchSettings.workloadWeight + dispatchSettings.responseWeight) * 100).toFixed(0)}%
                                    </span>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsDispatchModalOpen(false)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 h-16 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || (dispatchSettings.distanceWeight + dispatchSettings.ratingWeight + dispatchSettings.workloadWeight + dispatchSettings.responseWeight).toFixed(2) !== '1.00'}
                                        className="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : (
                                            <>
                                                <Save size={16} />
                                                Saqlash
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[48px] p-10 shadow-2xl space-y-8 overflow-hidden">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{editingZone ? "Hududni tahrirlash" : "Yangi hudud qo'shish"}</h3>
                                <p className="text-gray-400 text-xs font-bold">Barcha ma'lumotlarni to'g'ri kiriting</p>
                            </div>

                            <form onSubmit={handleSubmitZone} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Viloyat / Shahar</label>
                                        <select required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all">
                                            <option value="">Tanlang</option>
                                            {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tuman / Shahar <span className="text-red-500">*</span></label>
                                        <select value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all">
                                            <option value="">Tanlang</option>
                                            {formData.name && (districts[regions.find(r => r.name === formData.name)?.id || ''] || []).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Narxi (SO'M)</label>
                                        <input type="number" placeholder="0" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bepul (SO'M)</label>
                                        <input type="number" placeholder="Summa" value={formData.freeFrom} onChange={e => setFormData({ ...formData, freeFrom: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bepul (SONI)</label>
                                        <input type="number" placeholder="Soni" value={formData.freeFromQty} onChange={e => setFormData({ ...formData, freeFromQty: e.target.value })} className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-900 border-2 border-transparent focus:border-blue-500 transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Chegirmali bo'lsa bepul</label>
                                        <div
                                            onClick={() => setFormData({ ...formData, freeIfHasDiscount: !formData.freeIfHasDiscount })}
                                            className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all group"
                                        >
                                            <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${formData.freeIfHasDiscount ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                                <motion.div
                                                    animate={{ x: formData.freeIfHasDiscount ? 24 : 4 }}
                                                    className="w-4 h-4 bg-white rounded-full absolute top-1"
                                                />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase transition-colors ${formData.freeIfHasDiscount ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                {formData.freeIfHasDiscount ? "YONIK" : "O'CHIRILGAN"}
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all group"
                                    >
                                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <motion.div
                                                animate={{ x: formData.isActive ? 24 : 4 }}
                                                className="w-4 h-4 bg-white rounded-full absolute top-1"
                                            />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase transition-colors ${formData.isActive ? 'text-emerald-500' : 'text-gray-400'}`}>
                                            HUDUDNI FAOLLASHTIRISH
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 h-16 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all active:scale-95"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="animate-spin" /> : (
                                            <>
                                                <Save size={16} />
                                                {editingZone ? "Hududni saqlash" : "Hudud qo'shish"}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
