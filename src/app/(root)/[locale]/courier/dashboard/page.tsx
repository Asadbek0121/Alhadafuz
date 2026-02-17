
"use client";

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { MapPin, Navigation, CheckCircle, Package, User } from 'lucide-react';

const YANDEX_MAPS_URL = "https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=02bff7ee-f3da-4c8b-b0d6-b83dd0d38066&coordorder=latlong&load=package.full";

export default function CourierDashboard() {
    const { data: session } = useSession();
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const mapRef = useRef<any>(null);
    const multiRouteRef = useRef<any>(null);

    const fetchData = async () => {
        if (!session?.user?.id) return;
        try {
            const res = await fetch(`/api/delivery/orders?courierId=${session.user.id}`);
            const orders = await res.json();
            const active = orders.find((o: any) => o.status !== 'completed' && o.status !== 'cancelled');
            setActiveOrder(active || null);
        } catch (e) {
            console.error("Courier dashboard error", e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Har 5 soniyada yangilash
        return () => clearInterval(interval);
    }, [session]);

    const initMap = () => {
        const ymaps = (window as any).ymaps;
        if (!ymaps) return;
        ymaps.ready(() => {
            mapRef.current = new ymaps.Map('courier-map', {
                center: [37.2272, 67.2752],
                zoom: 14,
                controls: ['zoomControl']
            });
        });
    };

    useEffect(() => {
        if (!mapRef.current || !activeOrder) return;
        const ymaps = (window as any).ymaps;

        if (multiRouteRef.current) mapRef.current.geoObjects.remove(multiRouteRef.current);

        multiRouteRef.current = new ymaps.multiRouter.MultiRoute({
            referencePoints: [
                [37.2285, 67.2801], // Dummy courier starting point (could be navigator.geolocation)
                [activeOrder.customerLat, activeOrder.customerLng]
            ],
            params: { routingMode: 'auto' }
        }, {
            boundsAutoApply: true,
            routeActiveStrokeWidth: 6,
            routeActiveStrokeColor: "#10b981"
        });

        mapRef.current.geoObjects.add(multiRouteRef.current);
    }, [activeOrder]);

    const updateStatus = async (status: string) => {
        if (!activeOrder) return;
        try {
            const res = await fetch(`/api/delivery/orders/${activeOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success(`Status ${status} holatiga o'tdi`);
                fetchData();
            }
        } catch (e) {
            toast.error("Xatolik yuz berdi");
        }
    };

    const userRole = (session?.user as any)?.role;
    if (userRole !== 'COURIER' && userRole !== 'ADMIN') {
        return <div className="p-20 text-center font-bold">Ushbu sahifa faqat kuryerlar uchun.</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 pt-[70px]">
            <Script src={YANDEX_MAPS_URL} onLoad={initMap} />

            <div id="courier-map" className="flex-1" />

            {/* Floating Order Card */}
            <div className="p-6 bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[40px] z-[1000] border-t border-slate-100 pb-10">
                <div className="max-w-2xl mx-auto">
                    {activeOrder ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Buyurtma #{activeOrder.id.slice(-4)}</h3>
                                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{activeOrder.status}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-900">{activeOrder.price.toLocaleString()} so'm</div>
                                    <span className="text-[10px] font-bold text-slate-400">NAQD TO'LOV</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0">
                                        <User size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">MIJOZ</div>
                                        <div className="text-sm font-black text-slate-700 truncate">{activeOrder.customerName}</div>
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">MANZIL</div>
                                        <div className="text-sm font-black text-slate-700 truncate">{activeOrder.shippingAddress || "Manzil aniqlanmadi"}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => updateStatus(activeOrder.status === 'assigned' ? 'delivering' : 'completed')}
                                    className="flex-1 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black text-md shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {activeOrder.status === 'assigned' ? (
                                        <><Navigation size={20} /> YETKAZISHNI BOSHLASH</>
                                    ) : (
                                        <><CheckCircle size={20} /> YETKAZIB BERILDI</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Package size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter">Yangi buyurtmalar kutilmoqda</h3>
                                <p className="text-slate-400 font-semibold italic">Hozircha sizga biriktirilgan buyurtma yo'q</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-green-500 uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                Online Rejim
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
