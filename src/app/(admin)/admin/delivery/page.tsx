
"use client";

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { Truck, Activity, Package, Phone } from 'lucide-react';

const YANDEX_MAPS_URL = "https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=02bff7ee-f3da-4c8b-b0d6-b83dd0d38066&coordorder=latlong&load=package.full";

export default function AdminDeliveryMonitor() {
    const [orders, setOrders] = useState<any[]>([]);
    const [couriers, setCouriers] = useState<any[]>([]);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/admin/couriers/live');
                const data = await res.json();

                if (data.couriers) setCouriers(data.couriers);
                if (data.orders) setOrders(data.orders);
            } catch (e) {
                console.error("Monitor refresh error", e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const initMap = () => {
        const ymaps = (window as any).ymaps;
        if (!ymaps) return;
        ymaps.ready(() => {
            mapRef.current = new ymaps.Map('admin-map', {
                center: [37.2272, 67.2752],
                zoom: 12,
                controls: ['zoomControl', 'typeSelector']
            });
        });
    };

    useEffect(() => {
        if (!mapRef.current) return;
        const ymaps = (window as any).ymaps;
        mapRef.current.geoObjects.removeAll();

        // Add Orders
        orders.forEach(o => {
            const color = o.status === 'completed' ? 'green' : (o.status === 'delivering' ? 'blue' : 'red');
            const marker = new ymaps.Placemark([o.customerLat, o.customerLng], {
                balloonContent: `<strong>Buyurtma #${o.id.slice(-4)}</strong><br>Mijoz: ${o.customerName}<br>Status: ${o.status}`
            }, { preset: `islands#${color}CircleDotIcon` });
            mapRef.current.geoObjects.add(marker);
        });

        // Add Couriers
        couriers.forEach(c => {
            if (c.currentLat && c.currentLng) {
                const marker = new ymaps.Placemark([c.currentLat, c.currentLng], {
                    balloonContent: `<strong>${c.name}</strong><br>Status: ${c.status}<br>${c.phone}`
                }, { preset: 'islands#yellowSportIcon' });
                mapRef.current.geoObjects.add(marker);
            }
        });
    }, [orders, couriers]);

    return (
        <div className="flex flex-col xl:flex-row h-screen bg-slate-100 overflow-hidden">
            <Script src={YANDEX_MAPS_URL} onLoad={initMap} />

            <div id="admin-map" className="flex-1 h-full" />

            <div className="w-full xl:w-[450px] bg-white h-full flex flex-col shadow-2xl border-l border-slate-200">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Live Monitor</h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Jonli</span>
                        </div>
                    </div>
                    <p className="text-slate-400 font-semibold text-sm italic">Barcha yetkazib berish jarayonlari</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                            <div className="text-blue-600 mb-1"><Package size={20} /></div>
                            <div className="text-2xl font-black text-blue-900">{orders.length}</div>
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Buyurtmalar</div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100">
                            <div className="text-amber-600 mb-1"><Truck size={20} /></div>
                            <div className="text-2xl font-black text-amber-900">{couriers.length}</div>
                            <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Kuryerlar</div>
                        </div>
                    </div>

                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">So'nggi harakatlar</h3>

                    {orders.map(order => (
                        <div key={order.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-100 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-sm font-black text-slate-900">#{order.id.slice(-4)}</div>
                                    <div className="text-[11px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors uppercase">{order.customerName}</div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                    ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}
                                `}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs">
                                <Activity size={12} />
                                <span>{order.storeName}</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                                <span className="text-lg font-black text-slate-900">{order.price.toLocaleString()} so'm</span>
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                                    <Phone size={14} strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
