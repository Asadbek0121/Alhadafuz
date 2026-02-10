"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, X, Edit2, Trash2,
    Search, LayoutGrid, List as ListIcon,
    Loader2, MapPin, Phone, Clock,
    Navigation, Globe, Save, Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Script from 'next/script';

// Leaflet styles and scripts will be loaded via next/head or Script
declare var L: any;

type Store = {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    workingHours: string | null;
    lat: number | null;
    lng: number | null;
    createdAt: string;
};

export default function AdminStoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [editStore, setEditStore] = useState<Store | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [mapSearch, setMapSearch] = useState('');
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    const mapRef = useRef<any>(null);
    const inlineMapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const inlineMarkerRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const inlineMapContainerRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        workingHours: '',
        lat: '',
        lng: ''
    });

    const fetchStores = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/stores', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setStores(data);
            }
        } catch (error) {
            toast.error("Ma'lumotlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    // Initialize Full Modal Map
    useEffect(() => {
        let timer: any;
        if (showMapModal && leafletLoaded && mapContainerRef.current) {
            timer = setTimeout(() => {
                if (!mapContainerRef.current || typeof L === 'undefined') return;

                const initialLat = parseFloat(formData.lat) || 41.2995;
                const initialLng = parseFloat(formData.lng) || 69.2401;

                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }

                try {
                    mapRef.current = L.map(mapContainerRef.current, {
                        zoomControl: true,
                    }).setView([initialLat, initialLng], 13);

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(mapRef.current);

                    markerRef.current = L.marker([initialLat, initialLng], {
                        draggable: true
                    }).addTo(mapRef.current);

                    markerRef.current.on('dragend', (e: any) => {
                        const position = e.target.getLatLng();
                        const lat = position.lat.toFixed(6);
                        const lng = position.lng.toFixed(6);
                        setFormData(prev => ({ ...prev, lat, lng }));
                        if (inlineMarkerRef.current) inlineMarkerRef.current.setLatLng([lat, lng]);
                        if (inlineMapRef.current) inlineMapRef.current.setView([lat, lng]);
                    });

                    mapRef.current.on('click', (e: any) => {
                        const { lat, lng } = e.latlng;
                        const latF = lat.toFixed(6);
                        const lngF = lng.toFixed(6);
                        markerRef.current.setLatLng([lat, lng]);
                        setFormData(prev => ({ ...prev, lat: latF, lng: lngF }));
                        if (inlineMarkerRef.current) inlineMarkerRef.current.setLatLng([lat, lng]);
                        if (inlineMapRef.current) inlineMapRef.current.setView([lat, lng]);
                    });

                    setTimeout(() => mapRef.current?.invalidateSize(), 200);
                } catch (err) {
                    console.error("Map initialization failed", err);
                    toast.error("Xaritani yuklashda xatolik");
                }
            }, 500);
        }

        return () => {
            if (timer) clearTimeout(timer);
            if (!showMapModal && mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, [showMapModal, leafletLoaded]);

    // Initialize Inline Map (Preview)
    useEffect(() => {
        if (showForm && leafletLoaded && inlineMapContainerRef.current && !inlineMapRef.current && typeof L !== 'undefined') {
            const initialLat = parseFloat(formData.lat) || 41.2995;
            const initialLng = parseFloat(formData.lng) || 69.2401;

            try {
                inlineMapRef.current = L.map(inlineMapContainerRef.current, {
                    zoomControl: false,
                    attributionControl: false
                }).setView([initialLat, initialLng], 15);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(inlineMapRef.current);

                inlineMarkerRef.current = L.marker([initialLat, initialLng]).addTo(inlineMapRef.current);

                inlineMapRef.current.on('click', () => setShowMapModal(true));

                setTimeout(() => inlineMapRef.current?.invalidateSize(), 300);
            } catch (err) {
                console.error("Inline map failed", err);
            }
        }

        if (inlineMarkerRef.current && formData.lat && formData.lng && typeof L !== 'undefined') {
            const lat = parseFloat(formData.lat);
            const lng = parseFloat(formData.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                inlineMarkerRef.current.setLatLng([lat, lng]);
                inlineMapRef.current?.setView([lat, lng]);
            }
        }

        return () => {
            if (!showForm && inlineMapRef.current) {
                inlineMapRef.current.remove();
                inlineMapRef.current = null;
                inlineMarkerRef.current = null;
            }
        };
    }, [showForm, leafletLoaded, formData.lat, formData.lng]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolokatsiya brauzeringiz tomonidan qo'llab-quvvatlanmaydi");
            return;
        }

        const loadingToast = toast.loading("Joylashuvingiz aniqlanmoqda...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const lat = latitude.toFixed(6);
                const lng = longitude.toFixed(6);

                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([latitude, longitude], 16);
                    markerRef.current.setLatLng([latitude, longitude]);
                    setFormData(prev => ({ ...prev, lat, lng }));
                    if (inlineMarkerRef.current) inlineMarkerRef.current.setLatLng([latitude, longitude]);
                    if (inlineMapRef.current) inlineMapRef.current.setView([latitude, longitude]);
                    toast.dismiss(loadingToast);
                    toast.success("Joylashuv aniqlandi!");
                }
            },
            (error) => {
                toast.dismiss(loadingToast);
                toast.error("Joylashuvni aniqlashda xatolik yuz berdi");
            },
            { enableHighAccuracy: true }
        );
    };

    const handleSearchLocation = async () => {
        if (!mapSearch) return;
        const loadingToast = toast.loading("Qidirilmoqda...");
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}&countrycodes=uz`);
            const data = await res.json();
            toast.dismiss(loadingToast);

            if (data && data[0]) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);

                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([newLat, newLng], 15);
                    markerRef.current.setLatLng([newLat, newLng]);
                    setFormData(prev => ({
                        ...prev,
                        lat: newLat.toFixed(6),
                        lng: newLng.toFixed(6)
                    }));
                    if (inlineMarkerRef.current) inlineMarkerRef.current.setLatLng([newLat, newLng]);
                    if (inlineMapRef.current) inlineMapRef.current.setView([newLat, newLng]);
                    toast.success("Manzil topildi!");
                }
            } else {
                toast.error("Hech narsa topilmadi");
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("Qidiruvda xatolik");
        }
    };

    const handleEdit = (store: Store) => {
        setEditStore(store);
        setFormData({
            name: store.name,
            address: store.address,
            phone: store.phone || '',
            workingHours: store.workingHours || '',
            lat: store.lat ? String(store.lat) : '',
            lng: store.lng ? String(store.lng) : ''
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreate = () => {
        setEditStore(null);
        setFormData({
            name: '',
            address: '',
            phone: '+998 ',
            workingHours: '09:00 - 20:00',
            lat: '',
            lng: ''
        });
        setShowForm(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = editStore ? 'PUT' : 'POST';
            const url = editStore ? `/api/stores/${editStore.id}` : '/api/stores';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(editStore ? "Do'kon ma'lumotlari yangilandi!" : "Yangi do'kon qo'shildi!");
                setShowForm(false);
                fetchStores();
            } else {
                toast.error("Saqlashda xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Xatolik");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Do\'konni o\'chirishni tasdiqlaysizmi?')) return;
        try {
            const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Do'kon o'chirildi");
                fetchStores();
            } else {
                toast.error("O'chirishda xatolik");
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    const filteredStores = stores.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />
            <Script
                src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossOrigin=""
                onLoad={() => setLeafletLoaded(true)}
            />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Do'konlar Tarmoqlari</h1>
                    <p className="text-gray-500 mt-1">Filiallar va do'konlar joylashuvini boshqaring</p>
                </motion.div>
                <Button
                    onClick={() => { setShowForm(!showForm); if (!showForm) handleCreate(); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95 px-6 h-12"
                >
                    {showForm ? <X size={20} /> : <Plus size={20} />}
                    {showForm ? "Yopish" : "Filial Qo'shish"}
                </Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-2xl shadow-gray-200/50"
                    >
                        <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                {editStore ? <Edit2 size={20} /> : <Plus size={20} />}
                            </div>
                            {editStore ? 'Do\'konni tahrirlash' : 'Yangi do\'kon qo\'shish'}
                        </h2>

                        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Do'kon Nomi</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                        placeholder="Masalan: HADAF - Chilonzor"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1">Aniq Manzil</label>
                                    <textarea
                                        required
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        rows={3}
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none"
                                        placeholder="Masalan: Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi, 2-uy"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Telefon</label>
                                        <input
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
                                            placeholder="+998 90 123 45 67"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">Ish tartibi</label>
                                        <input
                                            value={formData.workingHours}
                                            onChange={e => setFormData({ ...formData, workingHours: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
                                            placeholder="09:00 - 20:00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-blue-50/30 p-8 rounded-[40px] border border-blue-100/50 space-y-6 relative overflow-hidden group/gps">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                                <Globe size={18} className="text-blue-500" /> GPS Koordinalar
                                            </h3>
                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Jonli xarita ko'rinishi</p>
                                        </div>
                                    </div>

                                    {/* Live Satellite Map Preview Area */}
                                    <div
                                        className="relative h-64 rounded-[32px] overflow-hidden border-4 border-white shadow-xl cursor-pointer group/map transition-all hover:shadow-2xl hover:scale-[1.01]"
                                    >
                                        <div id="inline-map" ref={inlineMapContainerRef} className="w-full h-full z-0" />

                                        <div
                                            onClick={() => setShowMapModal(true)}
                                            className="absolute inset-0 z-10 bg-transparent hover:bg-black/5 transition-colors flex items-end p-4"
                                        >
                                            <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-white/50 flex items-center justify-between w-full shadow-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                        <Navigation size={14} />
                                                    </div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                        Lat: <span className="text-blue-600 font-black">{formData.lat || '41.2995'}</span> •
                                                        Lng: <span className="text-blue-600 font-black ml-1">{formData.lng || '69.2401'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-white uppercase tracking-widest bg-blue-600 px-3 py-1.5 rounded-lg shadow-sm">Tanlash uchun bosing</div>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-blue-400 font-medium leading-relaxed italic text-center px-6">
                                        * Xarita orqali manzilni vizual belgilash kifoya. Koordinatalar avtomatik saqlanadi.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl shadow-xl shadow-blue-200 font-bold active:scale-95 transition-all"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        {editStore ? "O'zgarishlarni Saqlash" : "Do'konni Ro'yxatdan O'tkazish"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setShowForm(false); setEditStore(null); }}
                                        className="h-14 px-8 rounded-2xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50"
                                    >
                                        Bekor qilish
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List/Grid Section */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Do'konlarni qidirish..."
                                className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ListIcon size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-8 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 space-y-4">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-blue-50 animate-spin border-t-blue-500" />
                                <div className="absolute inset-0 flex items-center justify-center text-blue-500">
                                    <MapPin size={32} />
                                </div>
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] animate-pulse">Ma'lumotlar yuklanmoqda...</p>
                        </div>
                    ) : filteredStores.length > 0 ? (
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-4"}>
                            {filteredStores.map((store, index) => (
                                <motion.div
                                    key={store.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`group bg-white rounded-[32px] border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all ${viewMode === 'list' ? 'flex items-center p-6 gap-8' : 'flex flex-col'}`}
                                >
                                    <div className="p-8 flex-1 flex flex-col space-y-6 relative">
                                        <div className="flex items-center justify-between">
                                            <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
                                                <MapPin size={24} />
                                            </div>
                                            <div className="bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                                                OCHIQ
                                            </div>
                                        </div>

                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center justify-between gap-4">
                                                <h3 className="text-2xl font-black text-gray-900 tracking-tight truncate">{store.name}</h3>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(store); }}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                                                        title="Tahrirlash"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(store.id); }}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                                        title="O'chirish"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3.5">
                                                <div className="flex items-start gap-3.5 text-gray-500">
                                                    <MapPin size={20} className="text-gray-300 mt-0.5" />
                                                    <span className="text-sm font-bold leading-tight">{store.address}</span>
                                                </div>
                                                <div className="flex items-center gap-3.5 text-gray-500">
                                                    <Phone size={20} className="text-gray-300" />
                                                    <span className="text-sm font-bold">{store.phone || 'Kiritilmagan'}</span>
                                                </div>
                                                <div className="flex items-center gap-3.5 text-gray-500">
                                                    <Clock size={20} className="text-gray-300" />
                                                    <span className="text-sm font-bold">{store.workingHours || '09:00 - 20:00'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            {store.lat && store.lng ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full bg-[#F5F7F9] hover:bg-blue-600 hover:text-white text-gray-900 font-bold py-4 rounded-[20px] flex items-center justify-center gap-3 group/btn transition-all no-underline shadow-sm hover:shadow-lg hover:shadow-blue-200 cursor-pointer relative z-10"
                                                >
                                                    <Navigation size={18} className="text-gray-500 group-hover/btn:text-white transition-colors" />
                                                    <span className="text-[15px]">Xaritada ko'rish</span>
                                                </a>
                                            ) : (
                                                <div className="w-full bg-gray-50 text-gray-400 font-bold py-4 rounded-[20px] flex items-center justify-center gap-3 opacity-60">
                                                    <Navigation size={18} />
                                                    <span className="text-[15px]">Manzil aniqlanmagan</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-gray-50 flex items-center justify-center text-gray-300">
                                <Search size={48} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-gray-900">Do'kon topilmadi</p>
                                <p className="text-gray-400 max-w-xs mx-auto">Qidiruv so'rovini o'zgartirib ko'ring yoki yangi do'kon qo'shing</p>
                            </div>
                            <Button
                                onClick={handleCreate}
                                variant="outline"
                                className="rounded-xl border-gray-200"
                            >
                                Hammasini ko'rsatish
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            {/* Map Picker Modal */}
            <AnimatePresence>
                {showMapModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[40px] w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col relative"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-[110]">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        <MapPin className="text-blue-600" /> Manzilni tanlang
                                    </h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Xarita ustiga bosing yoki qidiring</p>
                                </div>
                                <div className="flex items-center gap-4 flex-1 max-w-md mx-10">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            value={mapSearch}
                                            onChange={(e) => setMapSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                                            placeholder="Shahar yoki ko'chani qidiring..."
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSearchLocation}
                                        className="bg-blue-600 hover:bg-blue-700 rounded-2xl h-12 px-6 font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
                                    >
                                        Qidirish
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowMapModal(false)}
                                    className="rounded-full w-12 h-12 p-0 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={24} className="text-gray-400" />
                                </Button>
                            </div>

                            <div className="relative flex-1 bg-gray-100">
                                <div className="absolute inset-0 z-0 bg-gray-50 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-4 text-gray-400">
                                        <Loader2 className="animate-spin" size={32} />
                                        <p className="text-sm font-black animate-pulse uppercase tracking-[2px]">Xarita yuklanmoqda...</p>
                                    </div>
                                </div>

                                <div id="map-container" ref={mapContainerRef} className="w-full h-full relative z-[1]" />

                                {/* Floating Action Controls */}
                                <div className="absolute top-10 right-10 z-[110] flex flex-col gap-4">
                                    <button
                                        onClick={handleGetCurrentLocation}
                                        className="w-14 h-14 bg-white hover:bg-blue-50 text-blue-600 rounded-2xl shadow-xl flex items-center justify-center transition-all active:scale-95 group border border-blue-100"
                                        title="Mening joylashuvim"
                                    >
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20 scale-150 group-hover:block" />
                                            <Navigation size={24} className="group-hover:rotate-45 transition-transform" />
                                        </div>
                                    </button>
                                </div>

                                <div className="absolute bottom-6 right-6 z-[110] bg-white/95 backdrop-blur-xl p-5 rounded-[32px] border border-white shadow-2xl shadow-blue-900/10 space-y-4 w-72">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                            <Navigation size={20} />
                                        </div>
                                        <div className="space-y-0.5 overflow-hidden">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Aniq koordinatalar</p>
                                            <p className="text-sm font-black text-blue-600 truncate">
                                                {formData.lat || '0.000'} , {formData.lng || '0.000'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100" />

                                    <Button
                                        onClick={() => setShowMapModal(false)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 rounded-2xl h-12 font-black text-white text-sm active:scale-95 transition-all shadow-lg shadow-blue-100"
                                    >
                                        Tasdiqlash
                                    </Button>
                                    <p className="text-[9px] text-gray-400 text-center font-bold leading-tight px-2">
                                        * Markerni kerakli nuqtaga sudrab qo'ying
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
