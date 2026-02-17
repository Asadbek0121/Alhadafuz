"use client";

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { toast } from 'sonner';
import { MapPin, Navigation, Clock, CreditCard, ChevronRight, Store } from 'lucide-react';

const YANDEX_MAPS_URL = "https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=02bff7ee-f3da-4c8b-b0d6-b83dd0d38066&coordorder=latlong&load=package.full";

export default function DeliveryPage() {
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStore, setSelectedStore] = useState<any>(null);
    const [customerCoords, setCustomerCoords] = useState<number[] | null>(null);
    const [routeInfo, setRouteInfo] = useState<any>(null);
    const [isOrdering, setIsOrdering] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    const mapRef = useRef<any>(null);
    const multiRouteRef = useRef<any>(null);
    const customerMarkerRef = useRef<any>(null);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const res = await fetch('/api/stores');
                const data = await res.json();
                setStores(data);
                if (data.length > 0) setSelectedStore(data[0]);
            } catch (e) {
                console.error("Store fetch error", e);
                toast.error("Do'konlarni yuklashda xatolik");
            }
        };
        fetchStores();
    }, []);

    const initMap = () => {
        const ymaps = (window as any).ymaps;
        if (!ymaps) return;

        ymaps.ready(() => {
            if (mapRef.current) return;

            mapRef.current = new ymaps.Map('delivery-map', {
                center: [37.2272, 67.2752], // Default Termez
                zoom: 13,
                controls: ['zoomControl', 'searchControl', 'geolocationControl']
            });

            // Stores
            stores.forEach(store => {
                const placemark = new ymaps.Placemark([store.lat, store.lng], {
                    balloonContent: `<strong>${store.name}</strong><br>${store.address}`
                }, { preset: 'islands#blueHomeIcon' });
                mapRef.current.geoObjects.add(placemark);
            });

            // Click event
            mapRef.current.events.add('click', (e: any) => {
                const coords = e.get('coords');
                setCustomerCoords(coords);
                updateCustomerMarker(coords);
            });

            // Auto-detect location
            locateMe();
        });
    };

    const locateMe = () => {
        if (!navigator.geolocation) {
            toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
            return;
        }
        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const coords = [latitude, longitude];

                if (mapRef.current) {
                    mapRef.current.setCenter(coords, 16, { duration: 1000 });
                    setCustomerCoords(coords);
                    updateCustomerMarker(coords);
                }
                setIsLoadingLocation(false);
                toast.success("Joylashuvingiz aniqlandi");
            },
            (err) => {
                console.warn("Geolocation error", err);
                setIsLoadingLocation(false);
                // toast.error("Joylashuvni aniqlab bo'lmadi. Xaritadan belgilang.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const updateCustomerMarker = (coords: number[]) => {
        const ymaps = (window as any).ymaps;
        if (!mapRef.current) return;

        if (customerMarkerRef.current) {
            mapRef.current.geoObjects.remove(customerMarkerRef.current);
        }

        customerMarkerRef.current = new ymaps.Placemark(coords, {
            hintContent: 'Yetkazib berish nuqtasi'
        }, {
            preset: 'islands#redDotIcon',
            draggable: true
        });

        customerMarkerRef.current.events.add('dragend', () => {
            const newCoords = customerMarkerRef.current.geometry.getCoordinates();
            setCustomerCoords(newCoords);
        });

        mapRef.current.geoObjects.add(customerMarkerRef.current);
    };

    useEffect(() => {
        if (customerCoords && selectedStore) {
            calculateRoute();
        }
    }, [customerCoords, selectedStore]);

    const calculateRoute = () => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapRef.current) return;

        if (multiRouteRef.current) mapRef.current.geoObjects.remove(multiRouteRef.current);

        multiRouteRef.current = new ymaps.multiRouter.MultiRoute({
            referencePoints: [
                [selectedStore.lat, selectedStore.lng],
                customerCoords
            ],
            params: { routingMode: 'auto' }
        }, {
            boundsAutoApply: true,
            routeActiveStrokeWidth: 6,
            routeActiveStrokeColor: "#2563eb"
        });

        multiRouteRef.current.model.events.add('requestsuccess', () => {
            const activeRoute = multiRouteRef.current.getActiveRoute();
            if (activeRoute) {
                const dist = (activeRoute.properties.get('distance').value / 1000).toFixed(1);
                const time = Math.round(activeRoute.properties.get('duration').value / 60);
                const price = Math.max(10000, Math.round(parseFloat(dist) * 2000));

                setRouteInfo({ distance: dist, duration: time, price });
            }
        });

        mapRef.current.geoObjects.add(multiRouteRef.current);
    };

    const handleOrder = async () => {
        if (!customerCoords || !selectedStore || !routeInfo) return;
        setIsOrdering(true);

        try {
            const res = await fetch('/api/delivery/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: selectedStore.id,
                    customerLat: customerCoords[0],
                    customerLng: customerCoords[1],
                    total: routeInfo.price
                })
            });

            if (res.ok) {
                toast.success("Buyurtma qabul qilindi!");
                setCustomerCoords(null);
                setRouteInfo(null);
                if (customerMarkerRef.current) mapRef.current.geoObjects.remove(customerMarkerRef.current);
                if (multiRouteRef.current) mapRef.current.geoObjects.remove(multiRouteRef.current);
            } else {
                toast.error("Xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Bog'lanishda xatolik");
        } finally {
            setIsOrdering(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 pt-[70px]">
            <Script src={YANDEX_MAPS_URL} onLoad={initMap} />

            <div className="relative flex-1 min-h-[400px] lg:h-auto order-2 lg:order-1">
                <div id="delivery-map" className="absolute inset-0 z-0" />
                <button
                    onClick={locateMe}
                    disabled={isLoadingLocation}
                    className="absolute bottom-6 right-6 z-10 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-70"
                >
                    {isLoadingLocation ? (
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Navigation size={24} fill="currentColor" />
                    )}
                </button>
            </div>

            <div className="w-full lg:w-[450px] bg-white p-6 lg:p-10 shadow-2xl z-10 overflow-y-auto border-l border-slate-100 order-1 lg:order-2">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Tezkor Yetkazish</h1>
                    <p className="text-slate-500 font-medium">Bitta marta bosish bilan buyurtma bering</p>
                </div>

                <div className="space-y-6">
                    {/* Store Selection */}
                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 hover:border-blue-100 transition-all">
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <Store size={18} strokeWidth={2.5} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Do'konni tanlang</span>
                        </div>
                        <select
                            className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10"
                            onChange={(e) => setSelectedStore(stores.find(s => s.id === e.target.value))}
                            value={selectedStore?.id || ''}
                        >
                            {stores.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Address Selection */}
                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <MapPin size={18} strokeWidth={2.5} />
                            <span className="text-[11px] font-black uppercase tracking-widest">Manzil</span>
                        </div>
                        <p className="font-bold text-slate-700">
                            {customerCoords ? "Manzil tanlandi ✅" : "Xaritada kerakli nuqtani bosing"}
                        </p>
                        {customerCoords && (
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                {customerCoords[0].toFixed(5)}, {customerCoords[1].toFixed(5)}
                            </p>
                        )}
                        {!customerCoords && (
                            <button onClick={locateMe} className="mt-3 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                <Navigation size={12} /> Mening joylashuvim
                            </button>
                        )}
                    </div>

                    {/* Route Info Card */}
                    {routeInfo && (
                        <div className="p-6 bg-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-500/20 transform animate-in fade-in slide-in-from-bottom-4">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest flex items-center gap-1">
                                        <Navigation size={10} /> Masofa
                                    </span>
                                    <div className="text-xl font-black">{routeInfo.distance} km</div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest flex items-center justify-end gap-1">
                                        <Clock size={10} /> Vaqt
                                    </span>
                                    <div className="text-xl font-black">~{routeInfo.duration} min</div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/20 flex justify-between items-end">
                                <div>
                                    <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Jami hisob</span>
                                    <div className="text-3xl font-black">{routeInfo.price.toLocaleString()} <small className="text-sm">so'm</small></div>
                                </div>
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <CreditCard size={20} />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleOrder}
                        disabled={!routeInfo || isOrdering}
                        className="group w-full py-5 bg-slate-900 hover:bg-black text-white rounded-[24px] font-black text-lg transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20"
                    >
                        {isOrdering ? "JO'NATILMOQDA..." : "TASDIQLASH"}
                        {!isOrdering && <ChevronRight className="group-hover:translate-x-1 transition-transform" />}
                    </button>

                    {routeInfo && (
                        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-2">
                            To'lov kuryerga naqd yoki karta orqali
                        </p>
                    )}
                </div>

                <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <div className="text-amber-500 font-bold mt-0.5">ⓘ</div>
                    <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                        Manzilni aniqroq tanlash uchun xaritadagi markerni surishingiz mumkin.
                    </p>
                </div>
            </div>
        </div>
    );
}
