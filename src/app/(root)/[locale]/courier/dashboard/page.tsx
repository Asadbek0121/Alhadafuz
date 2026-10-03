// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

"use client";

import { YANDEX_MAPS_KEY } from "@/lib/maps";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MapPin, Navigation, CheckCircle, Package, User, Phone, Wallet, BarChart3, ClipboardList } from 'lucide-react';

const YANDEX_MAPS_URL = `https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=${YANDEX_MAPS_KEY}&coordorder=latlong&load=package.full`;

type Order = {
    id: string;
    status: string;
    customerName: string;
    customerPhone?: string | null;
    customerLat?: number | null;
    customerLng?: number | null;
    address?: string | null;
    storeName?: string;
    price: number;
    paymentMethod?: string;
    paymentStatus?: string;
};

type Stats = {
    balance: number;
    totalDeliveries: number;
    rating: number;
    courierLevel: string;
    status: string;
    feePerOrder: number;
    todayCount: number;
    todayEarnings: number;
    weekCount: number;
    weekEarnings: number;
};

export default function CourierDashboard() {
    const { data: session } = useSession();
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [tab, setTab] = useState<'orders' | 'wallet' | 'stats'>('orders');
    const [courierPos, setCourierPos] = useState<[number, number] | null>(null);
    const mapRef = useRef<any>(null);
    const multiRouteRef = useRef<any>(null);

    const userRole = (session?.user as any)?.role;

    const fetchAll = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const [ordersRes, statsRes] = await Promise.all([
                fetch('/api/delivery/orders'),
                fetch('/api/delivery/couriers/stats')
            ]);
            if (ordersRes.ok) setOrders(await ordersRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (e) {
            console.error("Courier dashboard error", e);
        }
    }, [session]);

    useEffect(() => {
        const t = setTimeout(fetchAll, 0);
        const interval = setInterval(fetchAll, 5000);
        return () => { clearTimeout(t); clearInterval(interval); };
    }, [fetchAll]);

    // Haqiqiy GPS: kuryer joyini olish va har 30s serverga yozish
    useEffect(() => {
        if (userRole !== 'COURIER' && userRole !== 'ADMIN') return;
        let mounted = true;

        const sendLocation = (lat: number, lng: number) => {
            setCourierPos([lat, lng]);
            fetch('/api/delivery/couriers/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng })
            }).catch(() => { });
        };

        const update = () => {
            navigator.geolocation?.getCurrentPosition(
                (pos) => { if (mounted) sendLocation(pos.coords.latitude, pos.coords.longitude); },
                () => { },
                { enableHighAccuracy: true, maximumAge: 30000 }
            );
        };

        update();
        const interval = setInterval(update, 30000);
        return () => { mounted = false; clearInterval(interval); };
    }, [userRole]);

    // Faol buyurtmalar (COMPLETED/CANCELLED emas) — eng yangisi birinchi
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    const currentOrder = activeOrders[0] || null;

    const initMap = () => {
        const ymaps = (window as any).ymaps;
        if (!ymaps) return;
        ymaps.ready(() => {
            mapRef.current = new ymaps.Map('courier-map', {
                center: courierPos || [37.2272, 67.2752],
                zoom: 14,
                controls: ['zoomControl']
            });
        });
    };

    useEffect(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapRef.current || !currentOrder?.customerLat || !currentOrder?.customerLng) return;

        if (multiRouteRef.current) mapRef.current.geoObjects.remove(multiRouteRef.current);

        // Kuryer haqiqiy GPS joyidan mijozgacha marshrut; GPS bo'lmasa Termiz markazi
        const start = courierPos || [37.2285, 67.2801];
        multiRouteRef.current = new ymaps.multiRouter.MultiRoute({
            referencePoints: [start, [currentOrder.customerLat, currentOrder.customerLng]],
            params: { routingMode: 'auto' }
        }, {
            boundsAutoApply: true,
            routeActiveStrokeWidth: 6,
            routeActiveStrokeColor: "#10b981"
        });

        mapRef.current.geoObjects.add(multiRouteRef.current);
    }, [currentOrder, courierPos]);

    const updateStatus = async (status: string) => {
        if (!currentOrder) return;
        try {
            const res = await fetch(`/api/delivery/orders/${currentOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success(`Status ${status} holatiga o'tdi`);
                fetchAll();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch {
            toast.error("Xatolik yuz berdi");
        }
    };

    if (userRole !== 'COURIER' && userRole !== 'ADMIN') {
        return <div className="p-20 text-center font-bold">Ushbu sahifa faqat kuryerlar uchun.</div>;
    }

    const payLabel = (o: Order) =>
        (o.paymentMethod === 'CASH' ? '💵 Naqd to\'lov' : o.paymentMethod === 'P2P' ? '💳 Karta o\'tkazma' : `💳 ${o.paymentMethod || 'Karta'}`);

    return (
        <div className="flex flex-col h-screen bg-slate-50 pt-[70px]">
            <Script src={YANDEX_MAPS_URL} onLoad={initMap} />

            {/* Xarita — faqat Buyurtmalar tabida */}
            {tab === 'orders' && (
                <div id="courier-map" className="flex-1 min-h-[200px]" />
            )}

            {/* Balans kartasi — Hamyon tabida */}
            {tab === 'wallet' && stats && (
                <div className="flex-1 p-6">
                    <div className="max-w-md mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
                        <div className="text-xs font-black uppercase tracking-widest opacity-80">Balans</div>
                        <div className="text-4xl font-black mt-2">{stats.balance.toLocaleString()} so'm</div>
                        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Buyurtma haqi</div>
                                <div className="text-lg font-black">{stats.feePerOrder.toLocaleString()} so'm</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Jami yetkazish</div>
                                <div className="text-lg font-black">{stats.totalDeliveries} ta</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistika — Statistika tabida */}
            {tab === 'stats' && stats && (
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bugun</div>
                                <div className="text-2xl font-black text-slate-900 mt-1">{stats.todayCount} ta</div>
                                <div className="text-xs font-bold text-green-600">+{stats.todayEarnings.toLocaleString()} so'm</div>
                            </div>
                            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">7 kun</div>
                                <div className="text-2xl font-black text-slate-900 mt-1">{stats.weekCount} ta</div>
                                <div className="text-xs font-bold text-green-600">+{stats.weekEarnings.toLocaleString()} so'm</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reyting</div>
                                <div className="text-2xl font-black text-slate-900 mt-1">⭐ {Number(stats.rating).toFixed(1)}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daraja</div>
                                <div className="text-xl font-black text-amber-500 mt-1">{stats.courierLevel}</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Holat</div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${stats.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="font-black text-slate-700">{stats.status === 'ONLINE' ? 'Ishda' : 'Tanaffusda'}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-semibold mt-2">Holatni o'zgartirish: botda "🔄 Holat" tugmasi</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pastki panel — kontent */}
            {tab === 'orders' && (
                <div className="p-6 bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[40px] z-[1000] border-t border-slate-100 pb-10 max-h-[55vh] overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                        {currentOrder ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900">Buyurtma #{currentOrder.id.slice(-4)}</h3>
                                            <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{currentOrder.status}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-900">{currentOrder.price.toLocaleString()} so'm</div>
                                        <span className="text-[10px] font-bold text-slate-400">{payLabel(currentOrder)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0">
                                            <User size={18} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">MIJOZ</div>
                                            <div className="text-sm font-black text-slate-700 truncate">{currentOrder.customerName}</div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                                            <MapPin size={18} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">MANZIL</div>
                                            <div className="text-sm font-black text-slate-700 truncate">{currentOrder.address || currentOrder.storeName || "Manzil aniqlanmadi"}</div>
                                        </div>
                                    </div>
                                </div>

                                {currentOrder.customerPhone && (
                                    <a
                                        href={`tel:${currentOrder.customerPhone}`}
                                        className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-100 text-green-700 rounded-2xl font-black active:scale-95 transition-all"
                                    >
                                        <Phone size={18} /> {currentOrder.customerPhone}
                                    </a>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateStatus(currentOrder.status === 'assigned' ? 'delivering' : 'completed')}
                                        className="flex-1 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black text-md shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {currentOrder.status === 'assigned' ? (
                                            <><Navigation size={20} /> YETKAZISHNI BOSHLASH</>
                                        ) : (
                                            <><CheckCircle size={20} /> YETKAZIB BERILDI</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center space-y-3">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Package size={32} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tighter">Yangi buyurtmalar kutilmoqda</h3>
                                <p className="text-slate-400 font-semibold italic text-sm">Hozircha sizga biriktirilgan buyurtma yo'q</p>
                                {stats && (
                                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <div className={`w-1.5 h-1.5 rounded-full ${stats.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                        <span className={stats.status === 'ONLINE' ? 'text-green-500' : 'text-slate-400'}>
                                            {stats.status === 'ONLINE' ? 'Online rejim' : 'Tanaffus rejimi'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab navigatsiya */}
            <div className="bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)] z-[1001]">
                <div className="max-w-md mx-auto flex">
                    {([
                        { id: 'orders', icon: ClipboardList, label: 'Buyurtmalar' },
                        { id: 'wallet', icon: Wallet, label: 'Hamyon' },
                        { id: 'stats', icon: BarChart3, label: 'Statistika' }
                    ] as const).map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${tab === id ? 'text-blue-600' : 'text-slate-400'}`}
                        >
                            <Icon size={20} />
                            <span className="text-[10px] font-black">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
