
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Package, Truck, CheckCircle2, MapPin, Phone, User } from "lucide-react";
import Link from "next/link";

export default function CustomerTrackingPage() {
    const { orderId } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<any>(null);
    const leafletRef = useRef<any>(null);

    useEffect(() => {
        // Load Leaflet from CDN
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            leafletRef.current = (window as any).L;
        };
        document.head.appendChild(script);

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}/track`);
                const d = await res.json();
                setData(d);
                setLoading(false);
            } catch (e) {
                console.error("Tracking Error:", e);
            }
        };

        const interval = setInterval(fetchData, 10000); // 10s refresh
        fetchData();

        return () => {
            clearInterval(interval);
        };
    }, [orderId]);

    useEffect(() => {
        if (!data || !leafletRef.current || !data.courierLat) return;

        const L = leafletRef.current;
        if (!mapRef.current) {
            mapRef.current = L.map('tracking-map-container', {
                zoomControl: false,
                attributionControl: false
            }).setView([data.courierLat, data.courierLng], 14);

            // Premium Modern Tile Style
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                maxZoom: 20
            }).addTo(mapRef.current);

            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        }

        // Update markers (simple way for demo)
        mapRef.current.eachLayer((layer: any) => { if (layer instanceof L.Marker) mapRef.current.removeLayer(layer); });

        const courierIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="p-3 bg-blue-600 rounded-full border-4 border-white shadow-2xl text-white">🚚</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const destIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="p-3 bg-emerald-500 rounded-full border-4 border-white shadow-2xl text-white">📍</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        L.marker([data.courierLat, data.courierLng], { icon: courierIcon }).addTo(mapRef.current);
        L.marker([data.orderLat, data.orderLng], { icon: destIcon }).addTo(mapRef.current);

        // Fit bounds for the first time
        const bounds = L.latLngBounds([
            [data.courierLat, data.courierLng],
            [data.orderLat, data.orderLng]
        ]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    }, [data]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-black text-blue-600">
            Buyurtma qidirilmoqda...
        </div>
    );

    if (!data || data.error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-8">
            <Package size={64} className="text-gray-200 mb-4" />
            <h1 className="text-2xl font-black text-gray-900 mb-2">Buyurtma topilmadi</h1>
            <p className="text-gray-500 font-bold mb-6">Kiritilgan ID noto'g'ri yoki buyurtma hali yo'lga chiqmagan.</p>
            <Link href="/" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Bosh sahifaga qaytish</Link>
        </div>
    );

    const steps = [
        { label: 'Qabul qilindi', status: ['CREATED', 'ASSIGNED', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'COMPLETED'] },
        { label: 'Yo\'lda', status: ['DELIVERING', 'DELIVERED', 'COMPLETED'] },
        { label: 'Yetkazildi', status: ['DELIVERED', 'COMPLETED'] }
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Side: Map */}
            <div className="flex-1 min-h-[400px] lg:min-h-0 relative">
                <div id="tracking-map-container" className="absolute inset-0 z-0"></div>
                <div className="absolute top-6 left-6 z-10">
                    <div className="bg-white px-6 py-4 rounded-3xl shadow-2xl border border-gray-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black">H</div>
                        <div>
                            <div className="font-black text-gray-900 leading-none">HADAF MARKET</div>
                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Sizning buyurtmangiz yo'lda</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Details */}
            <div className="w-full lg:w-[450px] bg-white shadow-2xl z-10 flex flex-col p-8 lg:p-12 overflow-y-auto">
                <div className="mb-10 text-center lg:text-left">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full">Buyurtma #{data.orderId.slice(-6).toUpperCase()}</span>
                    <h2 className="text-3xl font-black text-gray-900 mt-4 tracking-tight">BUYURTMA HOLATI</h2>
                </div>

                {/* Progress */}
                <div className="space-y-8 mb-12 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-1 before:bg-gray-100">
                    {steps.map((step, idx) => {
                        const isDone = step.status.includes(data.status);
                        return (
                            <div key={idx} className={`flex items-center gap-6 relative transition-all ${isDone ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-lg ${isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>
                                    {isDone && <CheckCircle2 size={14} />}
                                </div>
                                <div>
                                    <div className={`font-black uppercase tracking-widest text-xs ${isDone ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{isDone ? 'Amalga oshirildi' : 'Kutilmoqda'}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Courier Info */}
                {data.courierName && (
                    <div className="bg-gray-50 rounded-[32px] p-6 border border-gray-100 mt-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-xl flex items-center justify-center overflow-hidden">
                                <User size={32} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Kuryer</div>
                                <div className="text-lg font-black text-gray-900">{data.courierName}</div>
                                <div className="flex items-center gap-1 mt-1 text-amber-500 font-bold text-xs uppercase tracking-widest">★ 4.9 • {data.courierLevel}</div>
                            </div>
                            <a href={`tel:${data.courierPhone}`} className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100 active:scale-90 transition-all">
                                <Phone size={20} />
                            </a>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                                <span className="text-gray-400">Yetkazish manzili:</span>
                                <span className="text-gray-900 max-w-[150px] truncate text-right">{data.shippingAddress}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
