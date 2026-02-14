
"use client";

import { useEffect, useState, useRef } from "react";
import { Truck, MapPin, Navigation, User, Zap, Search, Star } from "lucide-react";

interface Courier {
    id: string;
    name: string;
    status: string;
    currentLat: number;
    currentLng: number;
    vehicleType: string;
    courierLevel: string;
}

interface Order {
    id: string;
    status: string;
    lat: number;
    lng: number;
    shippingAddress: string;
}

export default function LiveMap() {
    const [data, setData] = useState<{ couriers: Courier[], orders: Order[] }>({ couriers: [], orders: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
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
            initMap();
        };
        document.head.appendChild(script);

        const fetchData = async () => {
            try {
                const res = await fetch('/api/admin/couriers/live');
                const d = await res.json();
                setData(d);
                setLoading(false);
            } catch (e) {
                console.error("Fetch live error:", e);
            }
        };

        const interval = setInterval(fetchData, 5000);
        fetchData();

        return () => {
            clearInterval(interval);
            document.head.removeChild(link);
            document.head.removeChild(script);
        };
    }, []);

    const initMap = () => {
        if (!leafletRef.current || mapRef.current) return;

        const L = leafletRef.current;
        // Tashkent coordinates
        mapRef.current = L.map('live-map-container', {
            zoomControl: false,
            attributionControl: false
        }).setView([41.2995, 69.2401], 12);

        // Define Base Layers
        const standard = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20 });
        const satellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        standard.addTo(mapRef.current);

        // Add Layer Switcher
        const baseMaps = {
            "Sodda": standard,
            "Sputnik": satellite
        };

        L.control.layers(baseMaps, {}, { position: 'topright' }).addTo(mapRef.current);
        L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    };

    const focusCourier = (c: Courier) => {
        if (!mapRef.current) return;
        mapRef.current.flyTo([c.currentLat, c.currentLng], 16, { duration: 1.5 });
        setSelectedCourierId(c.id);
    };

    useEffect(() => {
        if (!mapRef.current || !leafletRef.current || !data?.couriers || !data?.orders) return;

        const L = leafletRef.current;

        // Clear existing markers
        mapRef.current.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
                mapRef.current.removeLayer(layer);
            }
        });

        // Add Couriers
        data.couriers.forEach(c => {
            const isSelected = c.id === selectedCourierId;
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="relative transition-all duration-500 ${isSelected ? 'scale-125' : ''}">
                        <div class="absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-25"></div>
                        <div class="relative p-2.5 ${isSelected ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 'bg-blue-600'} rounded-full border-2 border-white shadow-2xl text-white transform hover:scale-125 transition-all">
                            ${c.vehicleType === 'CAR' ? '🚗' : '⚡'}
                        </div>
                       </div>`,
                iconSize: [35, 35],
                iconAnchor: [17, 17]
            });

            L.marker([c.currentLat, c.currentLng], { icon })
                .bindPopup(`
                    <div class="p-2 min-w-[150px] font-sans">
                        <div class="font-black text-xs uppercase tracking-widest text-blue-600 mb-1">${c.courierLevel}</div>
                        <div class="font-black text-gray-900 border-b pb-1 mb-1">${c.name}</div>
                        <div class="text-[10px] font-bold text-gray-500 mb-2">Transport: ${c.vehicleType}</div>
                        <a href="tel:${c.id}" class="block text-center w-full py-1.5 bg-gray-50 rounded-lg text-blue-600 font-black text-[10px] uppercase tracking-widest border border-gray-100 no-underline">Qo'ng'iroq</a>
                    </div>
                `)
                .addTo(mapRef.current);
        });

        // Add Orders
        data.orders.forEach(o => {
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="p-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-2xl text-white transform hover:scale-125 transition-all duration-300">
                        📍
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            L.marker([o.lat, o.lng], { icon })
                .bindPopup(`
                    <div class="p-2 font-sans">
                        <div class="font-black text-[10px] text-emerald-600 uppercase tracking-widest mb-1">Buyurtma #${o.id.slice(-6).toUpperCase()}</div>
                        <div class="font-bold text-gray-900 tracking-tight leading-tight text-xs">${o.shippingAddress}</div>
                    </div>
                `)
                .addTo(mapRef.current);
        });
    }, [data, selectedCourierId]);

    const filteredCouriers = (data?.couriers || []).filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[750px]">
            {/* Sidebar Control Panel */}
            <div className="w-full lg:w-[400px] flex flex-col gap-6">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Navigation size={14} className="text-blue-600" />
                            Flot boshqaruvi
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Kuryerni izlash..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-600 font-bold text-xs transition-all shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden flex-1 flex flex-col min-h-[500px]">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Onlayn kuryerlar ({filteredCouriers.length})</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-[550px] divide-y divide-gray-50 scrollbar-hide">
                        {filteredCouriers.length === 0 ? (
                            <div className="p-12 text-center">
                                <User size={40} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kuryer topilmadi</p>
                            </div>
                        ) : (
                            filteredCouriers.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => focusCourier(c)}
                                    className={`w-full p-6 text-left hover:bg-gray-50 transition-all flex items-center gap-4 group relative ${selectedCourierId === c.id ? 'bg-blue-50/80 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-blue-600' : ''}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl transform group-hover:scale-110 transition-all duration-300 ${selectedCourierId === c.id ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-50 text-blue-600'}`}>
                                        {c.vehicleType === 'CAR' ? '🚗' : '🛵'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-black text-gray-900 text-sm tracking-tight">{c.name}</div>
                                            <div className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${c.courierLevel === 'GOLD' ? 'bg-amber-100 text-amber-600' : c.courierLevel === 'SILVER' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {c.courierLevel}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                Onlayn
                                            </div>
                                            <div className="text-[10px] font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-widest flex items-center gap-1">
                                                <Star size={10} className="text-amber-400 fill-amber-400" /> 4.9
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="bg-white p-2.5 rounded-[56px] border-[6px] border-white shadow-[0_48px_80px_-16px_rgba(0,0,0,0.18)] overflow-hidden relative group" style={{ height: '750px' }}>
                    <div id="live-map-container" className="w-full h-full rounded-[48px] z-0"></div>

                    {loading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl z-20 flex items-center justify-center rounded-[56px]">
                            <div className="flex flex-col items-center gap-8">
                                <div className="w-20 h-20 border-[8px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <div className="font-black text-blue-600 uppercase tracking-[0.3em] text-xs">Sputnik aloqasi...</div>
                            </div>
                        </div>
                    )}

                    {/* Style Selection Cards (Small Legend) */}
                    <div className="absolute bottom-12 left-12 z-10 hidden lg:flex flex-col gap-3">
                        <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[32px] border border-white/50 shadow-2xl min-w-[200px]">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Transport turi</h4>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between group/item cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs shadow-lg shadow-blue-100">🚗</div>
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Avtomobil</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                                </div>
                                <div className="flex items-center justify-between group/item cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xs shadow-lg shadow-blue-100">🛵</div>
                                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Skuter (Tezkor)</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
