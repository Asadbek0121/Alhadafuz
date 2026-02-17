
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Package, Truck, CheckCircle2, MapPin, Phone, User, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";

export default function CustomerTrackingPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const [ymapsLoaded, setYmapsLoaded] = useState(false);
    const YANDEX_MAPS_URL = "https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=02bff7ee-f3da-4c8b-b0d6-b83dd0d38066&coordorder=latlong&load=package.full";
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<any>(null);
    const courierPlacemarkRef = useRef<any>(null);
    const destPlacemarkRef = useRef<any>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if ((window as any).ymaps) {
                setYmapsLoaded(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Fetch Data Effect
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/orders/${id}/track`);
                const d = await res.json();
                console.log("Tracking Data:", d);
                setData((prev: any) => {
                    if (prev && prev.orderLat && !d.orderLat && prev.shippingAddress === d.shippingAddress) {
                        return { ...d, orderLat: prev.orderLat, orderLng: prev.orderLng };
                    }
                    return d;
                });
                setLoading(false);
            } catch (e) {
                console.error("Tracking Error:", e);
            }
        };

        const interval = setInterval(fetchData, 10000);
        fetchData();
        return () => clearInterval(interval);
    }, [id]);

    // Yandex Maps Init & Update
    useEffect(() => {
        if (!data || !ymapsLoaded) return;

        const ymaps = (window as any).ymaps;

        ymaps.ready(() => {
            const centerLat = data.courierLat || data.orderLat || 41.2995;
            const centerLng = data.courierLng || data.orderLng || 69.2401;

            if (!mapRef.current) {
                const container = document.getElementById("tracking-map-container");
                if (container) {
                    mapRef.current = new ymaps.Map("tracking-map-container", {
                        center: [centerLat, centerLng],
                        zoom: 14,
                        controls: ['zoomControl', 'fullscreenControl']
                    });
                }
            }

            if (!mapRef.current) return;

            // Courier Marker
            if (data.courierLat && data.courierLng) {
                if (courierPlacemarkRef.current) {
                    courierPlacemarkRef.current.geometry.setCoordinates([data.courierLat, data.courierLng]);
                } else {
                    courierPlacemarkRef.current = new ymaps.Placemark([data.courierLat, data.courierLng], {
                        balloonContent: 'Kuryer: ' + (data.courierName || 'Kuryer')
                    }, {
                        preset: 'islands#blueCircleDotIconWithIcon',
                        iconColor: '#0052FF'
                    });
                    mapRef.current.geoObjects.add(courierPlacemarkRef.current);
                }
            }

            // Destination Marker
            if (data.orderLat && data.orderLng) {
                if (destPlacemarkRef.current) {
                    destPlacemarkRef.current.geometry.setCoordinates([data.orderLat, data.orderLng]);
                } else {
                    destPlacemarkRef.current = new ymaps.Placemark([data.orderLat, data.orderLng], {
                        balloonContent: 'Yetkazish manzili'
                    }, {
                        preset: 'islands#redHomeIcon',
                        iconColor: '#ff0000'
                    });
                    mapRef.current.geoObjects.add(destPlacemarkRef.current);
                }
            }

            // Move to show both if possible
            if (data.courierLat && data.orderLat) {
                const bounds = [[data.courierLat, data.courierLng], [data.orderLat, data.orderLng]];
                mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 });
            }
        });

    }, [data, ymapsLoaded]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Kuzatuv tizimi yuklanmoqda...</p>
            </div>
        </div>
    );

    if (!data || data.error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-8">
            <div className="w-24 h-24 bg-white rounded-[32px] shadow-sm flex items-center justify-center mb-6">
                <Package size={40} className="text-slate-200" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Buyurtma topilmadi</h1>
            <p className="text-slate-500 font-bold text-xs mb-8 uppercase tracking-widest">ID noto'g'ri yoki buyurtma hali faollashmadi.</p>
            <button onClick={() => router.push('/')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-200">Bosh sahifaga</button>
        </div>
    );

    const steps = [
        { label: 'Qabul qilindi', status: ['CREATED', 'ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'COMPLETED'] },
        { label: 'Yo\'lda', status: ['PICKED_UP', 'PROCESSING', 'DELIVERING', 'DELIVERED', 'COMPLETED'] },
        { label: 'Yetkazildi', status: ['DELIVERED', 'COMPLETED'] }
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Script
                src={YANDEX_MAPS_URL}
                onLoad={() => setYmapsLoaded(true)}
                strategy="lazyOnload"
            />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-black text-sm text-slate-900 tracking-tight uppercase">Buyurtma Kuzatuv</h1>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">#{id.slice(-8).toUpperCase()}</p>
                    </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${['DELIVERED', 'COMPLETED'].includes(data.status) ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600 animate-pulse'
                    }`}>
                    {data.status}
                </div>
            </header>

            <main className="container max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl shadow-slate-200 border border-white h-[450px] md:h-[600px] relative">
                            <div id="tracking-map-container" className="w-full h-full bg-slate-100" />

                            {/* Overlay Info Card */}
                            <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-80 bg-white/90 backdrop-blur-md p-6 rounded-[32px] shadow-2xl border border-white/50 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Hozirgi Holat</h3>
                                        <p className="text-sm font-black text-slate-900 uppercase">
                                            {['DELIVERED', 'COMPLETED'].includes(data.status) ? "Buyurtma yetkazib berildi" :
                                                ['PICKED_UP', 'DELIVERING'].includes(data.status) ? "Kuryer siz tomon yo'lda" :
                                                    "Buyurtma tayyorlanmoqda"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Details */}
                    <div className="space-y-6">
                        {/* Courier Info */}
                        {data.courierName && (
                            <div className="bg-white shadow-2xl shadow-slate-200 rounded-[40px] p-8 border border-white">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-white shadow-inner flex items-center justify-center text-blue-600 font-black text-xl">
                                        {data.courierName[0]}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sizning kuryeringiz</p>
                                        <h2 className="text-lg font-black text-slate-900 leading-tight">{data.courierName}</h2>
                                        <div className="flex items-center gap-1 mt-1 text-amber-500 font-bold text-[10px] uppercase tracking-widest">
                                            ★ 5.0 • {data.courierLevel || 'PRO'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <a href={`tel:${data.courierPhone}`} className="flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-blue-100">
                                        <Phone size={14} fill="currentColor" /> QO'NG'IROQ
                                    </a>
                                    <div className="flex items-center justify-center gap-2 bg-slate-50 text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100">
                                        {data.courierLevel || 'PRO'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Progress */}
                        <div className="bg-white shadow-xl shadow-slate-200 rounded-[40px] p-8 border border-white">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Yetkazib berish bosqichlari</h3>

                            <div className="space-y-8 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
                                {steps.map((step, idx) => {
                                    const isDone = step.status.includes(data.status);
                                    return (
                                        <div key={idx} className={`flex items-start gap-6 relative transition-all duration-500 ${isDone ? 'opacity-100' : 'opacity-20'}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-lg transition-colors duration-500 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                                                {isDone && <CheckCircle2 size={12} />}
                                            </div>
                                            <div>
                                                <div className={`font-black uppercase tracking-widest text-[10px] ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{isDone ? 'Amalga oshirildi' : 'Kutilayotgan bosqich'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-50">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yetkazish manzili</p>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1">{data.shippingAddress}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

