
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Package, Truck, CheckCircle2, MapPin, Phone, User } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export default function CustomerTrackingPage() {
    const { orderId } = useParams();
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

    // Fetch Data Effect (Same as before)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}/track`);
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
    }, [orderId]);

    // Geocoding Fallback (Same as before)
    useEffect(() => {
        if (data && !data.orderLat) {
            const tryGeo = async (query: string) => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                        headers: { 'User-Agent': 'HadafMarket-Client' }
                    });
                    const json = await res.json();
                    if (json && json.length > 0) return json[0];
                } catch (e) { console.warn("Geocoding error:", e); }
                return null;
            };

            const FALLBACK_CITIES: Record<string, [number, number]> = {
                "toshkent": [41.2995, 69.2401],
                "termiz": [37.2284, 67.2752],
                "termez": [37.2284, 67.2752],
                "samarqand": [39.6542, 66.9597],
                "samarkand": [39.6542, 66.9597],
                "buxoro": [39.7747, 64.4286],
                "bukhara": [39.7747, 64.4286],
                "andijon": [40.7821, 72.3442],
                "andijan": [40.7821, 72.3442],
                "fargona": [40.3842, 71.7843],
                "fergana": [40.3842, 71.7843],
                "ferghana": [40.3842, 71.7843],
                "namangan": [40.9983, 71.6726],
                "nukus": [42.4619, 59.6166],
                "navoiy": [40.1031, 65.3739],
                "navoi": [40.1031, 65.3739],
                "urganch": [41.5568, 60.6273],
                "urgench": [41.5568, 60.6273],
                "qarshi": [38.8610, 65.7847],
                "karshi": [38.8610, 65.7847],
                "jizzax": [40.1250, 67.8808],
                "jizzakh": [40.1250, 67.8808],
                "guliston": [40.4897, 68.7842],
                "nurafshon": [41.0422, 69.3586],
                "surxondaryo": [37.9409, 67.5708],
            };

            const runGeocoding = async () => {
                let foundGeo = null;
                if (data.shippingAddress) foundGeo = await tryGeo(data.shippingAddress);
                if (!foundGeo && data.shippingCity && data.shippingDistrict) foundGeo = await tryGeo(`${data.shippingDistrict}, ${data.shippingCity}`);
                if (!foundGeo && data.shippingCity) foundGeo = await tryGeo(data.shippingCity);

                if (foundGeo) {
                    setData((prev: any) => ({ ...prev, orderLat: parseFloat(foundGeo.lat), orderLng: parseFloat(foundGeo.lon) }));
                    return;
                }

                if (data.shippingAddress) {
                    const addrLower = data.shippingAddress.toLowerCase();
                    const matchedCity = Object.keys(FALLBACK_CITIES).find(city => addrLower.includes(city));
                    if (matchedCity) {
                        const [lat, lng] = FALLBACK_CITIES[matchedCity];
                        setData((prev: any) => ({ ...prev, orderLat: lat, orderLng: lng }));
                    }
                }
            };
            runGeocoding();
        }
    }, [data?.shippingAddress, data?.shippingCity, data?.shippingCity, data?.shippingDistrict]);

    // Yandex Maps Init & Update
    useEffect(() => {
        if (!data || !ymapsLoaded) return;

        const ymaps = (window as any).ymaps;

        ymaps.ready(() => {
            const centerLat = data.courierLat || data.orderLat || 41.2995;
            const centerLng = data.courierLng || data.orderLng || 69.2401;

            if (!mapRef.current) {
                mapRef.current = new ymaps.Map("tracking-map-container", {
                    center: [centerLat, centerLng],
                    zoom: 14,
                    controls: ['zoomControl', 'fullscreenControl']
                });
            }

            // Courier Marker
            if (data.courierLat && data.courierLng) {
                if (courierPlacemarkRef.current) {
                    courierPlacemarkRef.current.geometry.setCoordinates([data.courierLat, data.courierLng]);
                } else {
                    courierPlacemarkRef.current = new ymaps.Placemark([data.courierLat, data.courierLng], {
                        balloonContent: 'Kuryer: ' + (data.courierName || 'Kuryer')
                    }, {
                        preset: 'islands#blueDeliveryIcon'
                    });
                    mapRef.current.geoObjects.add(courierPlacemarkRef.current);
                }
            } else if (courierPlacemarkRef.current) {
                mapRef.current.geoObjects.remove(courierPlacemarkRef.current);
                courierPlacemarkRef.current = null;
            }

            // Destination Marker
            if (data.orderLat && data.orderLng) {
                if (destPlacemarkRef.current) {
                    destPlacemarkRef.current.geometry.setCoordinates([data.orderLat, data.orderLng]);
                } else {
                    destPlacemarkRef.current = new ymaps.Placemark([data.orderLat, data.orderLng], {
                        balloonContent: 'Yetkazish manzili'
                    }, {
                        preset: 'islands#darkGreenDotIcon' // Or specific icon
                    });
                    mapRef.current.geoObjects.add(destPlacemarkRef.current);

                    if (!data.courierLat) {
                        mapRef.current.setCenter([data.orderLat, data.orderLng], 14, { duration: 300 });
                    }
                }
            } else if (destPlacemarkRef.current) {
                mapRef.current.geoObjects.remove(destPlacemarkRef.current);
                destPlacemarkRef.current = null;
            }

            // Fit bounds if both markers are present
            if (courierPlacemarkRef.current && destPlacemarkRef.current) {
                const bounds = ymaps.util.bounds.fromPoints([
                    courierPlacemarkRef.current.geometry.getCoordinates(),
                    destPlacemarkRef.current.geometry.getCoordinates()
                ]);
                mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 });
            }
        });

    }, [data, ymapsLoaded]);

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
        { label: 'Qabul qilindi', status: ['CREATED', 'ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'COMPLETED'] },
        { label: 'Yo\'lda', status: ['PICKED_UP', 'PROCESSING', 'DELIVERING', 'DELIVERED', 'COMPLETED'] }, // Added PROCESSING here too if you want it to show as 'On the Way' immediately, or keep it strictly for moving. Let's assume PROCESSING implies courier is working on it.
        { label: 'Yetkazildi', status: ['DELIVERED', 'COMPLETED'] }
    ];



    return (
        <div className="min-h-screen bg-gray-50 pt-24">
            <Script
                src={YANDEX_MAPS_URL}
                onLoad={() => setYmapsLoaded(true)}
                strategy="lazyOnload"
            />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Buyurtma Kuzatuv</h1>
                    <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${data.status === 'delivered' || data.status === 'completed' ? 'bg-green-100 text-green-700' :
                        data.status === 'canceled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                        {data.status === 'pending' ? 'Kutilmoqda' :
                            data.status === 'accepted' ? 'Qabul qilindi' :
                                data.status === 'on_way' ? 'Yo\'lda' :
                                    data.status === 'delivered' ? 'Yetkazildi' : data.status}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Map Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-gray-100 h-[500px] relative">
                            <div id="tracking-map-container" className="w-full h-full bg-gray-100" />

                            {/* Overlay Info Card */}
                            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 z-10 max-w-xs">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-1">Hadaf Market</h3>
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">
                                    {['DELIVERED', 'COMPLETED'].includes(data.status) ? "BUYURTMA YETKAZILDI" :
                                        ['PICKED_UP', 'DELIVERING'].includes(data.status) ? "SIZNING BUYURTMANGIZ YO'LDA" :
                                            "BUYURTMA QABUL QILINDI"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Details Column */}
                    <div className="space-y-6">
                        <div className="bg-white shadow-2xl rounded-[32px] p-8 flex flex-col h-full">
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

                            {/* Shipping Details */}
                            <div className="bg-gray-50 rounded-[24px] p-6 border border-gray-100 shadow-sm mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Yetkazish Manzili</div>
                                        <div className="text-sm font-bold text-gray-900 leading-relaxed">
                                            {data.shippingAddress || "Manzil kiritilmagan"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Courier Info */}
                            {data.courierName && (
                                <div className="bg-blue-50 rounded-[32px] p-6 border border-blue-100 mt-auto">
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
