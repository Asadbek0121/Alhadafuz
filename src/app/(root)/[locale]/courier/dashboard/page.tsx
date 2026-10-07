// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

"use client";

import { YANDEX_MAPS_KEY } from "@/lib/maps";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Script from 'next/script';
import { toast } from 'sonner';
import {
    MapPin, Navigation, CheckCircle, Package, User, Phone, Wallet,
    BarChart3, ClipboardList, Map as MapIcon, ChevronDown, ChevronUp,
    ShieldAlert, Loader2, RefreshCw, Award, Star, ArrowUpRight, DollarSign,
    CheckCircle2, Clock
} from 'lucide-react';

const YANDEX_MAPS_URL = `https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=${YANDEX_MAPS_KEY}&coordorder=latlong&load=package.full`;

type OrderItem = { title: string; price: number; quantity: number; image?: string };
type Order = {
    id: string;
    orderNumber?: string | null;
    status: string;
    customerName: string;
    customerPhone?: string | null;
    customerLat?: number | null;
    customerLng?: number | null;
    address?: string | null;
    storeName?: string;
    price: number;
    paymentMethod?: string;
    items: OrderItem[];
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
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [tab, setTab] = useState<'orders' | 'wallet' | 'stats'>('orders');
    const [courierPos, setCourierPos] = useState<[number, number] | null>(null);
    const [itemsExpanded, setItemsExpanded] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    const mapRef = useRef<any>(null);
    const multiRouteRef = useRef<any>(null);

    const fetchAll = useCallback(async () => {
        const initData = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) || '';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const [ordersRes, statsRes] = await Promise.all([
                fetch('/api/delivery/orders', {
                    headers: { 'x-telegram-init-data': initData },
                    signal: controller.signal
                }),
                fetch('/api/delivery/couriers/stats', {
                    headers: { 'x-telegram-init-data': initData },
                    signal: controller.signal
                })
            ]);
            clearTimeout(timeoutId);

            if (ordersRes.ok && statsRes.ok) {
                setOrders(await ordersRes.json());
                setStats(await statsRes.json());
                setIsAuthorized(true);
            } else if (ordersRes.status === 401 || statsRes.status === 401) {
                setIsAuthorized(false);
            } else {
                setIsAuthorized(false);
            }
        } catch (e) {
            console.error("Courier dashboard fetch error", e);
            // Don't flip to false on transient network error if already authorized
            setIsAuthorized(prev => prev ?? false);
        }
    }, []);

    // Polling for orders and stats
    useEffect(() => {
        const interval = setInterval(fetchAll, 5000);
        fetchAll();
        return () => clearInterval(interval);
    }, [fetchAll]);

    // Track geolocation
    useEffect(() => {
        const initData = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) || '';

        const update = () => {
            navigator.geolocation?.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setCourierPos([lat, lng]);
                    fetch('/api/delivery/couriers/location', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-telegram-init-data': initData
                        },
                        body: JSON.stringify({ lat, lng })
                    }).catch(() => { });
                },
                () => { },
                { enableHighAccuracy: true, maximumAge: 30000 }
            );
        };
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, []);

    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    const currentOrder = activeOrders[0] || null;

    // Timeout fallback for auth check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isAuthorized === null) {
                setIsAuthorized(false);
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [isAuthorized]);

    // Yandex Maps initialization
    const initMap = useCallback(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps) return;

        ymaps.ready(() => {
            const container = document.getElementById('courier-map');
            if (!container) return;

            if (!mapRef.current) {
                mapRef.current = new ymaps.Map('courier-map', {
                    center: courierPos || [37.2272, 67.2752],
                    zoom: 14,
                    controls: ['zoomControl']
                });
                setMapLoaded(true);
            }
        });
    }, [courierPos]);

    // Try init map when tab changes to orders
    useEffect(() => {
        if (tab === 'orders' && typeof window !== 'undefined' && (window as any).ymaps) {
            initMap();
        }
    }, [tab, initMap]);

    // Draw route on map
    useEffect(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapRef.current || !currentOrder?.customerLat || !currentOrder?.customerLng) return;

        try {
            if (multiRouteRef.current) {
                mapRef.current.geoObjects.remove(multiRouteRef.current);
            }

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
        } catch (e) {
            console.error("Route drawing error:", e);
        }
    }, [currentOrder, courierPos, mapLoaded]);

    const updateStatus = async (status: string) => {
        if (!currentOrder) return;
        const initData = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) || '';
        const res = await fetch(`/api/delivery/orders/${currentOrder.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-telegram-init-data': initData
            },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            toast.success("Status yangilandi");
            fetchAll();
        } else {
            toast.error("Xatolik yuz berdi");
        }
    };

    const toggleStatus = async () => {
        toast.info("Statusni o'zgartirish uchun Telegram botga yozing: /status");
    };

    const openNavigator = () => {
        if (!currentOrder || !currentOrder.customerLat || !currentOrder.customerLng) return;

        const latFrom = courierPos ? courierPos[0] : 37.2285;
        const lngFrom = courierPos ? courierPos[1] : 67.2801;
        const latTo = currentOrder.customerLat;
        const lngTo = currentOrder.customerLng;

        const url = `https://yandex.com/maps/?rtext=${latFrom},${lngFrom}~${latTo},${lngTo}&rtt=auto`;
        window.open(url, '_blank');
    };

    if (isAuthorized === false) {
        return (
            <div className="p-10 min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-4">
                    <ShieldAlert size={32} />
                </div>
                <h1 className="text-xl font-black text-slate-900 mb-2">Faqat kuryerlar uchun</h1>
                <p className="text-sm text-slate-500 max-w-xs mb-6">Ushbu panelga kirish ruxsati faqat tasdiqlangan kuryerlarga beriladi.</p>
                <button
                    onClick={() => fetchAll()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Qayta tekshirish
                </button>
            </div>
        );
    }

    if (isAuthorized === null) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
                <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
                <p className="font-bold text-slate-700">Kuryer paneli yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
            <Script src={YANDEX_MAPS_URL} onLoad={initMap} />

            {/* Header: Title & Online Status */}
            <div className="absolute top-4 left-4 right-4 z-[1002] flex justify-between items-center">
                <h1 className="text-lg font-black text-slate-900 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
                    Kuryer Dashboard
                </h1>
                <button
                    onClick={toggleStatus}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-sm backdrop-blur-md transition-all ${stats?.status === 'ONLINE' ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-slate-200 text-slate-700'
                        }`}
                >
                    <div className={`w-2.5 h-2.5 rounded-full ${stats?.status === 'ONLINE' ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                    {stats?.status === 'ONLINE' ? 'Ishda' : 'Tanaffus'}
                </button>
            </div>

            {/* TAB 1: ORDERS & MAP */}
            {tab === 'orders' && (
                <div className="flex-1 flex flex-col relative w-full h-full pb-20">
                    {/* Yandex Map Container with explicit min-height */}
                    <div id="courier-map" className="w-full flex-1 min-h-[300px] bg-slate-200 relative" />

                    {/* Current Order Bottom Sheet */}
                    {currentOrder ? (
                        <div className="p-4 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[32px] z-[1000] border-t border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Joriy buyurtma</span>
                                    <h2 className="text-lg font-black text-slate-900">#{currentOrder.orderNumber || currentOrder.id.slice(-6)}</h2>
                                </div>
                                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100/50">
                                    {currentOrder.status === 'awaiting_payment' ? "To'lov kutilmoqda" : currentOrder.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 mb-3">
                                <a
                                    href={`tel:${currentOrder.customerPhone}`}
                                    className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-2xl font-bold text-xs hover:bg-green-100 transition-colors"
                                >
                                    <Phone size={16} /> Qo'ng'iroq qilish
                                </a>
                                <button
                                    onClick={openNavigator}
                                    className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-2xl font-bold text-xs hover:bg-blue-100 transition-colors"
                                >
                                    <MapIcon size={16} /> Navigatsiya
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-3.5 mb-3 border border-slate-100">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => setItemsExpanded(!itemsExpanded)}>
                                    <span className="text-xs font-bold text-slate-500 uppercase">Mahsulotlar ({currentOrder.items?.length || 0})</span>
                                    {itemsExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                </div>
                                {itemsExpanded && currentOrder.items && (
                                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-200/60">
                                        {currentOrder.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-xs font-medium text-slate-700">
                                                <span>{item.quantity}x {item.title}</span>
                                                <span className="font-bold text-slate-900">{(item.price * item.quantity).toLocaleString()} so'm</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-2 text-lg font-black text-slate-900">{currentOrder.price.toLocaleString()} so'm</div>
                            </div>

                            <button
                                onClick={() => updateStatus(currentOrder.status === 'assigned' ? 'delivering' : 'completed')}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                {currentOrder.status === 'assigned' ? "YETKAZISHNI BOSHLASH" : "YETKAZIB BERILDI"}
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.06)] rounded-t-[32px] z-[1000] border-t border-slate-100 text-center">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="text-base font-black text-slate-900 mb-1">Faol buyurtmalar yo'q</h3>
                            <p className="text-xs text-slate-500">Yangi buyurtmalar kelganda bot va ushbu sahifada ko'rinadi.</p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: WALLET */}
            {tab === 'wallet' && (
                <div className="flex-1 p-4 pt-20 pb-24 overflow-y-auto space-y-4">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                        <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block mb-1">Sof Balans</span>
                        <h2 className="text-3xl font-black mb-6">{(stats?.balance || 0).toLocaleString()} <span className="text-lg font-normal text-blue-200">so'm</span></h2>

                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
                            <div>
                                <span className="text-[10px] font-medium text-blue-200 block">Bugun ishlangan</span>
                                <span className="text-sm font-black">{(stats?.todayEarnings || 0).toLocaleString()} so'm</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-medium text-blue-200 block">Bir yetkazish uchun</span>
                                <span className="text-sm font-black">{(stats?.feePerOrder || 0).toLocaleString()} so'm</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-2">
                                <DollarSign size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Shu hafta</span>
                            <span className="text-base font-black text-slate-900">{(stats?.weekEarnings || 0).toLocaleString()} so'm</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-2">
                                <Award size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Kuryer darajasi</span>
                            <span className="text-base font-black text-slate-900">{stats?.courierLevel || "Standart"}</span>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Hisob-kitob qoidalari</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Har bir muvaffaqiyatli yetkazilgan buyurtma uchun balansizga avtomatik ravishda belgilangan haq qo'shiladi.
                        </p>
                    </div>
                </div>
            )}

            {/* TAB 3: STATS */}
            {tab === 'stats' && (
                <div className="flex-1 p-4 pt-20 pb-24 overflow-y-auto space-y-4">
                    {/* Overall Rating & Deliveries */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                <Star size={24} fill="currentColor" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 block">{stats?.rating?.toFixed(1) || "5.0"}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Reyting</span>
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                                <Package size={24} />
                            </div>
                            <span className="text-2xl font-black text-slate-900 block">{stats?.totalDeliveries || 0}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Jami yetkazmalar</span>
                        </div>
                    </div>

                    {/* Deliveries Breakdown */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Yetkazmalar statistikasi</h3>

                        <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Clock size={16} />
                                </div>
                                <span className="text-xs font-bold text-slate-700">Bugungi buyurtmalar</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{stats?.todayCount || 0} ta</span>
                        </div>

                        <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <BarChart3 size={16} />
                                </div>
                                <span className="text-xs font-bold text-slate-700">Shu haftada</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{stats?.weekCount || 0} ta</span>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 z-[1001] px-4 py-2 flex justify-around shadow-lg">
                <button
                    onClick={() => setTab('orders')}
                    className={`flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all ${tab === 'orders' ? 'text-blue-600 font-black scale-105' : 'text-slate-400 font-medium'
                        }`}
                >
                    <MapIcon size={20} />
                    <span className="text-[10px]">Buyurtmalar</span>
                </button>

                <button
                    onClick={() => setTab('wallet')}
                    className={`flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all ${tab === 'wallet' ? 'text-blue-600 font-black scale-105' : 'text-slate-400 font-medium'
                        }`}
                >
                    <Wallet size={20} />
                    <span className="text-[10px]">Hamyon</span>
                </button>

                <button
                    onClick={() => setTab('stats')}
                    className={`flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition-all ${tab === 'stats' ? 'text-blue-600 font-black scale-105' : 'text-slate-400 font-medium'
                        }`}
                >
                    <BarChart3 size={20} />
                    <span className="text-[10px]">Statistika</span>
                </button>
            </div>
        </div>
    );
}
