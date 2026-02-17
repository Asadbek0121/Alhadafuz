"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useMapStore } from '@/store/useMapStore';
import { useLocationStore } from '@/store/useLocationStore';
import { X, MapPin, Search, Navigation, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import { toast } from 'sonner';

const YANDEX_MAPS_URL = "https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=02bff7ee-f3da-4c8b-b0d6-b83dd0d38066&coordorder=latlong&load=package.full";
const DEFAULT_COORDS = [41.311081, 69.240562]; // Tashkent

export default function MapModal() {
    const { isMapOpen, closeMap } = useMapStore();
    const { setLocation, lat: storedLat, lng: storedLng } = useLocationStore();

    const [mapLoaded, setMapLoaded] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [addressDetails, setAddressDetails] = useState<any>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    const mapRef = useRef<any>(null);
    const placemarkRef = useRef<any>(null);

    // Check if script is already loaded (from other pages)
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).ymaps) {
            setMapLoaded(true);
        }
    }, []);

    const reverseGeocode = async (lat: number, lng: number) => {
        setIsSearching(true);
        try {
            const res = await fetch(`/api/geocode?lat=${lat}&lon=${lng}`);
            if (res.ok) {
                const data = await res.json();
                setAddressDetails({ ...data, lat, lng });
            }
        } catch (error) {
            console.error("Geocode error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const initMap = () => {
        const ymaps = (window as any).ymaps;
        if (!ymaps) return;

        ymaps.ready(() => {
            const container = document.getElementById('yandex-map-container-modal');
            if (!container) return;

            // If map already exists, just update center
            if (mapRef.current) {
                // Already initialized
                return;
            }

            const initialLat = storedLat || DEFAULT_COORDS[0];
            const initialLng = storedLng || DEFAULT_COORDS[1];

            const map = new ymaps.Map(container, {
                center: [initialLat, initialLng],
                zoom: 18,
                controls: []
            }, {
                suppressMapOpenBlock: true
            });

            // Add controls with custom positions to avoid UI overlap
            map.controls.add('zoomControl', { float: 'none', position: { left: 10, top: 150 }, size: 'small' });
            map.controls.add('typeSelector', { float: 'none', position: { top: 90, right: 10 }, size: 'small' });
            map.controls.add('trafficControl', { float: 'none', position: { top: 135, right: 10 }, size: 'small' });
            map.controls.add('fullscreenControl', { float: 'none', position: { right: 10, bottom: 40 } });

            mapRef.current = map;

            // Create Draggable Placemark
            const placemark = new ymaps.Placemark([initialLat, initialLng], {}, {
                draggable: true,
                preset: 'islands#blueDotIcon',
                iconColor: '#2563eb'
            });

            placemark.events.add('dragend', () => {
                const coords = placemark.geometry.getCoordinates();
                reverseGeocode(coords[0], coords[1]);
            });

            map.geoObjects.add(placemark);
            placemarkRef.current = placemark;

            // Map Click Event
            map.events.add('click', (e: any) => {
                const coords = e.get('coords');
                placemark.geometry.setCoordinates(coords);
                reverseGeocode(coords[0], coords[1]);
            });

            // Initial reverse geocode
            reverseGeocode(initialLat, initialLng);
        });
    };

    // Initialize/Destroy map on open/close
    useEffect(() => {
        if (isMapOpen && mapLoaded) {
            // Small timeout to ensure DOM is ready
            setTimeout(initMap, 100);
        }

        return () => {
            if (!isMapOpen && mapRef.current) {
                mapRef.current.destroy();
                mapRef.current = null;
                placemarkRef.current = null;
            }
        };
    }, [isMapOpen, mapLoaded]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data && data.lat && data.lng) {
                const nLat = data.lat;
                const nLng = data.lng;

                if (mapRef.current && placemarkRef.current) {
                    mapRef.current.setCenter([nLat, nLng], 16, { duration: 500 });
                    placemarkRef.current.geometry.setCoordinates([nLat, nLng]);
                }
                setAddressDetails(data);
            } else {
                toast.error("Manzil topilmadi");
            }
        } catch (error) {
            toast.error("Qidiruv xatoligi");
        } finally {
            setIsSearching(false);
        }
    };

    const detectMyLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolokatsiya qo'llab-quvvatlanmaydi");
        setIsDetecting(true);

        const handleSuccess = (pos: GeolocationPosition) => {
            const { latitude, longitude } = pos.coords;
            if (mapRef.current && placemarkRef.current) {
                mapRef.current.setCenter([latitude, longitude], 16, { duration: 500 });
                placemarkRef.current.geometry.setCoordinates([latitude, longitude]);
                reverseGeocode(latitude, longitude);
            }
            setIsDetecting(false);
        };

        const handleError = (err: GeolocationPositionError) => {
            console.warn("High Accuracy Geo Failed:", err.message, err.code);
            // If Position Unavailable (2) or Timeout (3), try low accuracy
            if (err.code === 2 || err.code === 3) {
                toast("Aniq joylashuv topilmadi, umumiy qidirilmoqda...", { icon: '⚠️' });
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (err2) => {
                        console.warn("Low Accuracy Geo Failed, trying IP...", err2.message);

                        // Fallback to IP Location
                        fetch('https://ipapi.co/json/')
                            .then(res => res.json())
                            .then(data => {
                                if (data.latitude && data.longitude) {
                                    handleSuccess({
                                        coords: { latitude: data.latitude, longitude: data.longitude }
                                    } as any);
                                    toast.success("Joylashuv taxminiy aniqlandi (IP)");
                                } else {
                                    throw new Error("No lat/lng");
                                }
                            })
                            .catch(() => {
                                setIsDetecting(false);
                                toast.error("Joylashuvni aniqlab bo'lmadi. Xaritadan o'zingiz belgilang.");
                            });
                    },
                    { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
                );
                return;
            }

            setIsDetecting(false);
            let msg = "Xatolik yuz berdi";
            if (err.code === 1) msg = "Geolokatsiyaga ruxsat berilmadi";
            toast.error(msg);
        };

        navigator.geolocation.getCurrentPosition(
            handleSuccess,
            handleError,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    };

    return (
        <>
            <Script
                src={YANDEX_MAPS_URL}
                onLoad={() => setMapLoaded(true)}
                strategy="lazyOnload"
            />

            <AnimatePresence>
                {isMapOpen && (
                    <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-0 md:p-6 lg:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeMap}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            className="relative bg-white w-full h-[92vh] md:h-full md:max-w-6xl md:rounded-[40px] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col md:flex-row"
                        >
                            <div className="relative flex-1 min-h-[45%] md:h-full overflow-hidden order-1 md:order-2">
                                {/* Map Container - Important to have ID */}
                                <div id="yandex-map-container-modal" className="absolute inset-0 z-0 bg-slate-100" />

                                <div className="absolute top-2 left-2 right-2 md:top-6 md:left-6 md:right-6 z-[400] flex gap-2 pointer-events-none">
                                    <form onSubmit={handleSearch} className="flex-1 max-w-md pointer-events-auto">
                                        <div className="relative flex items-center group">
                                            <div className="absolute left-2 md:left-4 z-10"><Search size={14} className="text-slate-400 group-focus-within:text-blue-600 transition-colors md:w-5 md:h-5" /></div>
                                            <input type="text" placeholder="Manzilni qidiring..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-2 py-2 md:pl-12 md:pr-4 md:py-4 bg-white/90 backdrop-blur-xl border border-white/20 rounded-[12px] md:rounded-[24px] shadow-2xl shadow-blue-900/10 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-[10px] md:text-base text-slate-800 placeholder:font-semibold placeholder:text-slate-400"
                                            />
                                        </div>
                                    </form>
                                    <button onClick={closeMap} className="pointer-events-auto p-2 md:p-4 bg-white/90 backdrop-blur-xl border border-white/20 rounded-[12px] md:rounded-[24px] shadow-2xl text-slate-500 hover:bg-white transition-all active:scale-95 flex items-center justify-center ml-auto">
                                        <X size={18} strokeWidth={2.5} className="md:w-6 md:h-6" />
                                    </button>
                                </div>

                                <button onClick={detectMyLocation} disabled={isDetecting}
                                    className="absolute bottom-16 right-3 md:bottom-8 md:right-8 z-[400] w-10 h-10 md:w-16 md:h-16 bg-white rounded-full shadow-2xl hover:bg-slate-50 transition-all border-2 md:border-4 border-white active:scale-90 flex items-center justify-center group"
                                >
                                    {isDetecting ? <Loader2 className="animate-spin text-blue-600 w-4 h-4 md:w-6 md:h-6" /> : <Navigation className="text-blue-600 group-hover:scale-110 transition-transform w-4 h-4 md:w-6 md:h-6" fill="currentColor" />}
                                </button>
                            </div>

                            <div className="order-2 md:order-1 w-full md:w-[400px] lg:w-[450px] bg-white flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:shadow-none z-10 rounded-t-[32px] md:rounded-none max-h-[60%] md:max-h-full overflow-hidden md:border-r border-slate-100">
                                <div className="flex-1 overflow-y-auto p-5 md:p-10">
                                    <div className="flex flex-col gap-1 md:gap-2 mb-3 md:mb-6">
                                        <h2 className="text-lg xs:text-xl md:text-4xl font-black text-slate-900 tracking-tighter">Manzilni tanlash</h2>
                                        <p className="text-[10px] xs:text-xs md:text-base text-slate-400 font-semibold">Yetkazib berish uchun nuqtani belgilang</p>
                                    </div>
                                    <div className="flex flex-col gap-3 md:gap-6">
                                        <div className="relative p-4 md:p-6 bg-slate-50 rounded-[20px] md:rounded-[32px] border border-slate-100 overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all hidden md:block" />
                                            <div className="relative z-10 flex flex-col gap-2 md:gap-4">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                                        <MapPin className="text-white" size={16} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] md:tracking-[0.2em]">Tanlangan hudud</span>
                                                </div>
                                                <div className="flex flex-col gap-1 min-h-[36px] md:min-h-[60px]">
                                                    {isSearching ? (
                                                        <div className="animate-pulse space-y-2">
                                                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                                        </div>
                                                    ) : (
                                                        <h3 className="text-sm xs:text-base sm:text-lg md:text-2xl font-black text-slate-900 leading-snug line-clamp-2 md:line-clamp-none">
                                                            {addressDetails?.address || "Xaritadan tanlang"}
                                                        </h3>
                                                    )}
                                                </div>
                                                <div className="flex gap-4 pt-2 border-t border-slate-200/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Shahar</span>
                                                        <span className="text-[10px] xs:text-xs md:text-sm font-black text-slate-700">{addressDetails?.city || "—"}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tuman</span>
                                                        <span className="text-[10px] xs:text-xs md:text-sm font-black text-slate-700">{addressDetails?.district || "—"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-2 p-2 md:p-4 bg-amber-50 rounded-xl md:rounded-2xl border border-amber-100">
                                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                                                    <Info size={14} className="text-white" />
                                                </div>
                                                <p className="text-[9px] md:text-xs font-bold text-amber-900 leading-tight">
                                                    Marker qo'lda surilishi mumkin.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 md:p-10 md:pt-0 bg-white border-t border-slate-100 md:border-0 z-20">
                                    <button onClick={() => {
                                        if (addressDetails) {
                                            setLocation({
                                                address: addressDetails.address,
                                                city: addressDetails.city,
                                                district: addressDetails.district,
                                                lat: addressDetails.lat,
                                                lng: addressDetails.lng
                                            });
                                            closeMap();
                                            toast.success(`Manzil saqlandi: ${addressDetails.address}`);
                                        }
                                    }} disabled={!addressDetails || isSearching}
                                        className="w-full py-3 md:py-6 rounded-[16px] md:rounded-[32px] bg-slate-900 hover:bg-blue-600 text-white font-black text-xs md:text-lg shadow-xl md:shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none group relative overflow-hidden"
                                    >
                                        <span className="relative z-10 transition-colors">MANZILNI TASDIQLASH</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
