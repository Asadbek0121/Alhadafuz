// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

"use client";

import { YANDEX_MAPS_KEY } from "@/lib/maps";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import Script from 'next/script';
import { useSession, signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { MapPin, Navigation, CheckCircle, Package, User, Phone, Wallet, BarChart3, ClipboardList, Send, Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';

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
    const { data: session, status } = useSession();
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [tab, setTab] = useState<'orders' | 'wallet' | 'stats'>('orders');
    const [courierPos, setCourierPos] = useState<[number, number] | null>(null);
    const [itemsExpanded, setItemsExpanded] = useState(false);
    const mapRef = useRef<any>(null);
    const multiRouteRef = useRef<any>(null);

    useEffect(() => {
        if (status === 'unauthenticated' && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
            const initData = (window as any).Telegram.WebApp.initData;
            signIn("telegram-login", { initData, redirect: false }).then(response => {
                if (response?.error) {
                    console.error("Telegram WebApp login error:", response.error);
                    toast.error("Telegram orqali kirishda xatolik!");
                } else if (response?.ok && response?.url) {
                    // If signIn is successful and it's not a redirect, we might need to refresh the session
                    // window.location.reload(); // This causes full page refresh, maybe not ideal for Mini App
                    // Or force update session if possible
                    // toast.success("Muvaffaqiyatli kirildi!");
                }
            });
        }
    }, [status]); // Run once when component mounts and session status is known

    const fetchAll = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const [ordersRes, statsRes] = await Promise.all([
                fetch('/api/delivery/orders', { headers: { 'x-telegram-init-data': (window as any).Telegram?.WebApp?.initData || '' } }),
                fetch('/api/delivery/couriers/stats', { headers: { 'x-telegram-init-data': (window as any).Telegram?.WebApp?.initData || '' } })
            ]);
            if (ordersRes.ok) setOrders(await ordersRes.json());
            else if (ordersRes.status === 401) {
                // Unauthorized, possibly session expired or not a courier, force re-auth
                console.log("Unauthorized from /api/delivery/orders");
            }
            if (statsRes.ok) setStats(await statsRes.json());
            else if (statsRes.status === 401) {
                console.log("Unauthorized from /api/delivery/couriers/stats");
            }
        } catch (e) {
            console.error("Courier dashboard error", e);
        }
    }, [session]);

    useEffect(() => {
        if (!session?.user?.id || ((session.user as any)?.role !== 'COURIER' && (session.user as any)?.role !== 'ADMIN')) return;
        const interval = setInterval(fetchAll, 5000);
        fetchAll();
        return () => clearInterval(interval);
    }, [fetchAll, session?.user?.id, (session?.user as any)?.role]);

    useEffect(() => {
        if (!session?.user?.id || ((session.user as any)?.role !== 'COURIER' && (session.user as any)?.role !== 'ADMIN')) return;
        const update = () => {
            navigator.geolocation?.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setCourierPos([lat, lng]);
                    fetch('/api/delivery/couriers/location', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-telegram-init-data': (window as any).Telegram?.WebApp?.initData || ''
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
    }, [session?.user?.id, (session?.user as any)?.role]);

    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    const currentOrder = activeOrders[0] || null;

    useEffect(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapRef.current || !currentOrder?.customerLat || !currentOrder?.customerLng) return;
        if (multiRouteRef.current) mapRef.current.geoObjects.remove(multiRouteRef.current);

        const start = courierPos || [37.2285, 67.2801];
        multiRouteRef.current = new ymaps.multiRouter.MultiRoute({
            referencePoints: [start, [currentOrder.customerLat, currentOrder.customerLng]],
            params: { routingMode: 'auto' }
        }, { boundsAutoApply: true, routeActiveStrokeWidth: 6, routeActiveStrokeColor: "#10b981" });
        mapRef.current.geoObjects.add(multiRouteRef.current);
    }, [currentOrder, courierPos]);

    if (status === 'loading') return <div className="p-20 text-center">Yuklanmoqda...</div>;

    if (!session?.user || ((session.user as any)?.role !== 'COURIER' && (session.user as any)?.role !== 'ADMIN')) {
        return <div className="p-20 text-center">Faqat kuryerlar uchun.</div>;
    }

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

    const updateStatus = async (status: string) => {
        if (!currentOrder) return;
        const res = await fetch(`/api/delivery/orders/${currentOrder.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': (window as any).Telegram?.WebApp?.initData || '' },
            body: JSON.stringify({ status })
        });
        if (res.ok) { toast.success("Status yangilandi"); fetchAll(); }
        else toast.error("Xatolik");
    };

    const toggleStatus = async () => {
        // Mocking bot'dagi status toggle
        toast.info("Statusni o'zgartirish uchun botga yozing: /status");
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

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Script src={YANDEX_MAPS_URL} onLoad={initMap} />

            {/* Header: Status Toggle */}
            <div className="absolute top-4 left-4 right-4 z-[1002] flex justify-between items-center">
                <h1 className="text-xl font-black text-slate-900 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm">Kuryer Dashboard</h1>
                <button onClick={toggleStatus} className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 ${stats?.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${stats?.status === 'ONLINE' ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {stats?.status === 'ONLINE' ? 'Ishda' : 'Tanaffus'}
                </button>
            </div>

            {tab === 'orders' && <div id="courier-map" className="flex-1" />}

            {tab === 'orders' && currentOrder && (
                <div className="p-4 bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[32px] z-[1000] border-t border-slate-100 pb-20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-black text-slate-900">Buyurtma #{currentOrder.orderNumber || currentOrder.id.slice(-4)}</h2>
                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {currentOrder.status === 'awaiting_payment' ? "To'lov kutilmoqda" : currentOrder.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <a href={`tel:${currentOrder.customerPhone}`} className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-2xl font-black text-sm">
                            <Phone size={18} /> Qo'ng'iroq
                        </a>
                        <button onClick={openNavigator} className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-2xl font-black text-sm">
                            <MapIcon size={18} /> Navigatsiya
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                        <div className="flex justify-between items-center mb-2" onClick={() => setItemsExpanded(!itemsExpanded)}>
                            <span className="text-xs font-black text-slate-400 uppercase">Mahsulotlar ({currentOrder.items.length})</span>
                            {itemsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {itemsExpanded && (
                            <div className="space-y-2 mt-2">
                                {currentOrder.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span>{item.quantity}x {item.title}</span>
                                        <span className="font-bold">{item.price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3 text-xl font-black">{currentOrder.price.toLocaleString()} so'm</div>
                    </div>

                    <button
                        onClick={() => updateStatus(currentOrder.status === 'assigned' ? 'delivering' : 'completed')}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        {currentOrder.status === 'assigned' ? "YETKAZISHNI BOSHLASH" : "YETKAZIB BERILDI"}
                    </button>
                </div>
            )}

            {/* Bottom Nav ... (qolgan kod qismi) */}
        </div>
    );
}
