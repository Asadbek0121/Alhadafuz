// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

"use client";

import { YANDEX_MAPS_KEY } from "@/lib/maps";
import { useEffect, useState, useRef } from "react";
import { Truck, MapPin, Navigation, User, Search, Star, Layers, Target, Phone, Activity, Globe, Zap } from "lucide-react";
import Script from "next/script";

import { useSearchParams } from "next/navigation";

interface Courier {
    id: string;
    name: string;
    status: string;
    currentLat: number;
    currentLng: number;
    vehicleType: string;
    courierLevel: string;
    phone: string;
    lastOnlineAt: string;
}

interface Order {
    id: string;
    status: string;
    lat: number;
    lng: number;
    shippingAddress: string;
}

export default function LiveMap() {
    const searchParams = useSearchParams();
    const queryCourierId = searchParams.get('courierId');

    const [data, setData] = useState<{ couriers: Courier[], orders: Order[] }>({ couriers: [], orders: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
    const [ymapsLoaded, setYmapsLoaded] = useState(false);

    useEffect(() => {
        if (queryCourierId) {
            setSelectedCourierId(queryCourierId);
        }
    }, [queryCourierId]);

    const mapRef = useRef<any>(null);
    const courierCollectionRef = useRef<any>(null);
    const orderCollectionRef = useRef<any>(null);
    const YANDEX_MAPS_URL = `https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=${YANDEX_MAPS_KEY}&coordorder=latlong`;

    const fetchTrackingData = async () => {
        try {
            const res = await fetch('/api/admin/couriers/live');
            if (!res.ok) {
                const text = await res.text();
                if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                    console.warn('Live API returned HTML (likely session expired):', res.status);
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.warn('Live API did not return JSON:', contentType);
                return;
            }

            const d = await res.json();
            setData(d);
            setLoading(false);
        } catch (e) {
            console.error("Fetch live error:", e);
        }
    };

    useEffect(() => {
        const scriptInterval = setInterval(() => {
            if ((window as any).ymaps) {
                setYmapsLoaded(true);
                clearInterval(scriptInterval);
            }
        }, 500);

        const dataInterval = setInterval(fetchTrackingData, 10000);
        fetchTrackingData();

        return () => {
            clearInterval(scriptInterval);
            clearInterval(dataInterval);
        };
    }, []);

    // Yandex Maps Initialization
    useEffect(() => {
        if (!ymapsLoaded) return;

        const ymaps = (window as any).ymaps;
        ymaps.ready(() => {
            if (!mapRef.current) {
                mapRef.current = new ymaps.Map("live-map-container", {
                    center: [37.2242, 67.2783], // Termiz Center
                    zoom: 12,
                    controls: ['zoomControl', 'fullscreenControl', 'typeSelector'],
                    behaviors: ['default', 'scrollZoom']
                });

                // Set a custom style if needed via options, though default Yandex is quite clean.

                courierCollectionRef.current = new ymaps.GeoObjectCollection();
                orderCollectionRef.current = new ymaps.GeoObjectCollection();

                mapRef.current.geoObjects.add(courierCollectionRef.current);
                mapRef.current.geoObjects.add(orderCollectionRef.current);
            }
            updateMarkers();
        });
    }, [ymapsLoaded]);

    const updateMarkers = () => {
        if (!mapRef.current || !ymapsLoaded) return;
        const ymaps = (window as any).ymaps;

        // Clear existing markers
        courierCollectionRef.current.removeAll();
        orderCollectionRef.current.removeAll();

        // Add Couriers
        data.couriers.forEach(c => {
            const isSelected = c.id === selectedCourierId;
            const vType = (c.vehicleType || '').toUpperCase();
            
            const icon = vType.includes('MASHINA') || vType.includes('CAR') ? '🚗' : 
                         vType.includes('MOTO') ? '🛵' : 
                         vType.includes('VELO') ? '🚴' : '🚶';

            // Premium Balloon Layout
            const balloonContent = `
                <div style="font-family: 'Inter', -apple-system, sans-serif; padding: 12px; min-width: 220px; color: #1e293b;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <span style="font-size: 16px; font-weight: 800; color: #0f172a;">${c.name}</span>
                        <div style="display: flex; align-items: center; gap: 4px; background: #fffbeb; padding: 2px 6px; border-radius: 6px;">
                            <span style="color: #f59e0b; font-size: 10px;">★</span>
                            <span style="color: #b45309; font-size: 10px; font-weight: 900;">5.0</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <span style="background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${c.courierLevel || 'BRONZE'}</span>
                        <span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase;">ONLINE</span>
                    </div>

                    <div style="background: #f8fafc; padding: 10px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #f1f5f9;">
                        <div style="font-size: 11px; margin-bottom: 4px;">
                            <span style="color: #64748b; font-weight: 600;">Ulov:</span> 
                            <span style="color: #334155; font-weight: 700; margin-left: 4px;">${vType} ${icon}</span>
                        </div>
                        <div style="font-size: 11px;">
                            <span style="color: #64748b; font-weight: 600;">ID:</span> 
                            <span style="color: #334155; font-weight: 700; margin-left: 4px;">#${c.id.slice(-6).toUpperCase()}</span>
                        </div>
                    </div>

                    <a href="tel:${c.phone}" style="display: block; width: 100%; text-align: center; padding: 12px; background: #0052FF; color: white; border-radius: 12px; font-size: 11px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(0, 82, 255, 0.2); transition: all 0.2s;">
                        📞 QO'NG'IROQ QILISH
                    </a>
                </div>
            `;

            const courierPlacemark = new ymaps.Placemark([c.currentLat, c.currentLng], {
                balloonContent: balloonContent,
                hintContent: c.name
            }, {
                // Custom Layout for Marker
                iconLayout: 'default#imageWithContent',
                iconImageHref: '', // Transparent or empty as we use content
                iconImageSize: [40, 40],
                iconImageOffset: [-20, -20],
                iconContentLayout: ymaps.templateLayoutFactory.createClass(
                    `<div style="
                        width: 40px; height: 40px; 
                        background: ${isSelected ? '#F59E0B' : '#0052FF'}; 
                        border: 3px solid white; 
                        border-radius: 14px; 
                        display: flex; align-items: center; justify-content: center; 
                        font-size: 20px; 
                        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                        transform: rotate(-10deg);
                    ">
                        ${icon}
                    </div>`
                ),
                hasBalloon: true,
                hideIconOnBalloonOpen: false
            });

            courierPlacemark.events.add('click', () => setSelectedCourierId(c.id));
            courierCollectionRef.current.add(courierPlacemark);
        });

        // Add Orders
        data.orders.forEach(o => {
            const orderPlacemark = new ymaps.Placemark([o.lat, o.lng], {
                hintContent: `Buyurtma #${o.id.slice(-6).toUpperCase()}`,
                balloonContent: `
                    <div style="font-family:'Inter', sans-serif; padding:5px;">
                        <div style="font-weight:900; color:#10B981; font-size:10px; text-transform:uppercase; margin-bottom:4px;">Buyurtma #${o.id.slice(-6).toUpperCase()}</div>
                        <div style="font-weight:700; color:#1e293b; font-size:12px;">${o.shippingAddress}</div>
                    </div>
                `
            }, {
                preset: 'islands#emeraldHomeCircleIcon',
                iconColor: '#10B981'
            });
            orderCollectionRef.current.add(orderPlacemark);
        });
    };

    // Update markers when data or selection changes
    useEffect(() => {
        updateMarkers();
    }, [data, selectedCourierId]);

    const focusCourier = (c: Courier) => {
        if (!mapRef.current || !ymapsLoaded) return;
        setSelectedCourierId(c.id);
        mapRef.current.setCenter([c.currentLat, c.currentLng], 16, {
            duration: 800,
            timingFunction: 'ease-in-out'
        });
    };

    const filteredCouriers = (data?.couriers || []).filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col xl:flex-row gap-6 h-full">
            <Script
                src={YANDEX_MAPS_URL}
                onLoad={() => setYmapsLoaded(true)}
                strategy="afterInteractive"
            />

            {/* Premium Sidebar */}
            <div className="w-full xl:w-[300px] flex flex-col gap-4 h-full shrink-0">
                {/* Stats Summary Card */}
                <div className="bg-slate-900 rounded-2xl p-4 shadow-xl relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                                <Activity size={16} className="text-blue-400" />
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 backdrop-blur-md rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Onlayn Kuryerlar</p>
                                <h4 className="text-2xl font-black text-white">{data.couriers.length}</h4>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Faol Buyurtmalar</p>
                                <h4 className="text-2xl font-black text-white">{data.orders.length}</h4>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter & Search */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="p-3.5 border-b border-slate-50 bg-slate-50/30 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input
                                type="text"
                                placeholder="Kuryer izlash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-200 font-bold text-sm transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                        {filteredCouriers.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <User size={28} className="text-slate-200" />
                                </div>
                                <h5 className="text-xs font-black text-slate-900 mb-1 uppercase">Kuryerlar Topilmadi</h5>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bot orqali lokatsiya yuborishganiga ishonch hosil qiling.</p>
                            </div>
                        ) : (
                            filteredCouriers.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => focusCourier(c)}
                                    className={`w-full p-3 text-left hover:bg-slate-50/80 transition-all flex items-center gap-3 relative ${selectedCourierId === c.id ? 'bg-blue-50/50 after:absolute after:left-0 after:top-3 after:bottom-3 after:w-1 after:bg-blue-600 after:rounded-r-full' : ''}`}
                                    aria-label={`${c.name} kuryerini tanlash`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md shrink-0 ${selectedCourierId === c.id ? 'bg-blue-600 text-white' : 'bg-white border-2 border-slate-50'}`}>
                                        {c.vehicleType === 'CAR' ? '🚗' : '🛵'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center gap-1">
                                            <div className="font-black text-slate-800 text-sm truncate">{c.name}</div>
                                            <div className="flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                                                <Star size={9} className="text-amber-500 fill-amber-500" />
                                                <span className="text-[9px] font-black text-amber-600">5.0</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.status}</span>
                                            </div>
                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest shrink-0">
                                                {c.vehicleType}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 min-h-[500px] h-full relative">
                <div className="bg-white p-2 rounded-3xl border border-slate-100 shadow-lg h-full overflow-hidden group">
                    <div id="live-map-container" className="w-full h-full rounded-2xl z-0 overflow-hidden shadow-inner bg-slate-50"></div>

                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-3xl z-30 flex items-center justify-center rounded-3xl m-2">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-[8px] border-blue-50 rounded-full"></div>
                                    <div className="w-16 h-16 border-[8px] border-blue-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                                    <Globe className="absolute inset-0 m-auto text-blue-600 animate-pulse" size={22} />
                                </div>
                                <div className="text-center">
                                    <h5 className="font-black text-slate-900 uppercase tracking-[0.4em] text-[10px] mb-1">Satellite Sync</h5>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kuryerlar bilan aloqa o'rnatilmoqda...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Floating Map Controls */}
                    {!loading && (
                        <div className="absolute top-20 right-4 z-[20] flex flex-col gap-2">
                            <button
                                onClick={() => mapRef.current?.setCenter([41.311081, 69.240562], 12)}
                                className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all border border-slate-50"
                                title="Markazlash"
                                aria-label="Markazlash"
                            >
                                <Target size={16} />
                            </button>

                            <button
                                onClick={() => {
                                    const currentType = mapRef.current.getType();
                                    mapRef.current.setType(currentType === 'yandex#map' ? 'yandex#satellite' : 'yandex#map');
                                }}
                                className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-50"
                                title="Xarita turini o'zgartirish"
                                aria-label="Xarita turini o'zgartirish"
                            >
                                <Layers size={16} />
                            </button>
                        </div>
                    )}

                    {/* Legend Overlay Card */}
                    <div className="absolute bottom-4 left-4 z-[20] hidden 2xl:block">
                        <div className="bg-slate-900/90 backdrop-blur-2xl p-4 rounded-2xl border border-white/10 shadow-xl min-w-[220px]">
                            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Transport Indikatorlari</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-base shadow-xl shadow-blue-600/20">🚗</div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Avtomobil</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Katta sig'im</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-base shadow-xl shadow-indigo-600/20">🛵</div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Skuter / Moto</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Tezkor Ekspress</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-base shadow-xl shadow-emerald-600/20">🚴</div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Velosiped</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Ekologik</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center text-base shadow-xl shadow-slate-700/20">🚶</div>
                                    <div>
                                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Piyoda</p>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Yaqin masofa</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f5f9;
                    border-radius: 20px;
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                [class*="ymaps-2-1-79-map"] {
                    border-radius: 42px !important;
                }
                .ymaps-2-1-79-inner-panes {
                    border-radius: 42px !important;
                }
            `}} />
        </div>
    );
}
