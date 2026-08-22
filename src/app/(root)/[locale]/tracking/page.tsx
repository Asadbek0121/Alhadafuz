"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { YANDEX_MAPS_KEY } from "@/lib/maps";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Truck, MapPin, Phone, User, Store, Clock, ChevronRight, Navigation, PackageSearch, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

const YANDEX_MAPS_URL = `https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=${YANDEX_MAPS_KEY}&coordorder=latlong&load=package.full`;
const TERMEZ_CENTER: [number, number] = [37.2272, 67.2752];

interface TrackOrder {
    id: string;
    status: string;
    createdAt: string;
    orderLat: number | null;
    orderLng: number | null;
    shippingAddress?: string | null;
    courierName?: string | null;
    courierPhone?: string | null;
    courierLat?: number | null;
    courierLng?: number | null;
    courierVehicle?: string | null;
    courierLevel?: string | null;
    courierLastLocation?: string | null;
    locationAgeSec?: number | null;
    departedAt?: number | null;
    store?: { name: string; address: string; lat: number; lng: number } | null;
}

const STATUS_LABEL: Record<string, string> = {
    ASSIGNED: "Buyurtma kuryerga biriktirildi",
    PROCESSING: "Buyurtma tayyorlanmoqda",
    PICKED_UP: "Kuryer buyurtmani oldi",
    DELIVERING: "Kuryer siz tomon yo'lda",
};

export default function TrackingPage() {
    const t = useTranslations('Profile');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState<TrackOrder[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ymapsLoaded, setYmapsLoaded] = useState(false);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const multiRouteRef = useRef<any>(null);

    const selectedOrder = orders.find(o => o.id === selectedId) || orders[0] || null;

    // Yandex Maps script yuklanishini kutish
    useEffect(() => {
        const interval = setInterval(() => {
            if ((window as any).ymaps) {
                setYmapsLoaded(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Polling: faol buyurtmalar + kuryer joylashuvi
    useEffect(() => {
        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/orders/tracking', { cache: 'no-store' });
                if (res.status === 401) {
                    router.push('/?auth=login&callbackUrl=/tracking');
                    return;
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (cancelled) return;
                const list = data.orders || [];
                setOrders(list);
                // URL'da ?order= bo'lsa — shu buyurtmani tanlaymiz (faqat birinchi yuklashda)
                if (list.length > 0) {
                    const urlOrderId = searchParams.get('order');
                    const target = urlOrderId
                        ? list.find((o: TrackOrder) => o.id === urlOrderId) || list[0]
                        : list[0];
                    setSelectedId(target.id);
                }
                setError(null);
            } catch (e) {
                if (cancelled) return;
                console.error("Tracking dashboard fetch error:", e);
                setError("Ma'lumot yuklanmadi. Qayta urinib ko'ring.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchOrders();
        interval = setInterval(fetchOrders, 8000);
        return () => { cancelled = true; if (interval) clearInterval(interval); };
    }, [router, searchParams]);

    // Xarita markerlarini yangilash
    const updateMarkers = useCallback((order: TrackOrder) => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapRef.current) return;

        // Eski markerlar + marshrutni tozalash
        markersRef.current.forEach(m => mapRef.current.geoObjects.remove(m));
        markersRef.current = [];
        if (multiRouteRef.current) {
            mapRef.current.geoObjects.remove(multiRouteRef.current);
            multiRouteRef.current = null;
        }

        const hasCourier = order.courierLat != null && order.courierLng != null;
        const hasDest = order.orderLat != null && order.orderLng != null;
        const hasStore = order.store?.lat != null && order.store?.lng != null;

        // Do'kon (boshlang'ich nuqta)
        if (hasStore && order.store) {
            const storeMark = new ymaps.Placemark(
                [order.store.lat, order.store.lng],
                { balloonContent: `<strong>${order.store.name}</strong><br>${order.store.address}` },
                { preset: 'islands#blueHomeIcon' }
            );
            mapRef.current.geoObjects.add(storeMark);
            markersRef.current.push(storeMark);
        }

        // Kuryer (real-time)
        if (hasCourier) {
            const courierMark = new ymaps.Placemark(
                [order.courierLat, order.courierLng],
                { hintContent: order.courierName || 'Kuryer' },
                { preset: 'islands#redTransportIcon', draggable: false }
            );
            mapRef.current.geoObjects.add(courierMark);
            markersRef.current.push(courierMark);
        }

        // Mijoz manzili (yakuniy nuqta)
        if (hasDest) {
            const destMark = new ymaps.Placemark(
                [order.orderLat, order.orderLng],
                { hintContent: 'Yetkazib berish manzili' },
                { preset: 'islands#greenDotIcon' }
            );
            mapRef.current.geoObjects.add(destMark);
            markersRef.current.push(destMark);
        }

        // Marshrut: do'kon → kuryer → manzil (kuryer bor bo'lsa)
        if (hasStore && order.store && hasDest) {
            const refs: any[] = [[order.store.lat, order.store.lng]];
            if (hasCourier) refs.push([order.courierLat, order.courierLng]);
            refs.push([order.orderLat, order.orderLng]);

            multiRouteRef.current = new ymaps.multiRouter.MultiRoute({
                referencePoints: refs,
                params: { routingMode: 'auto' }
            }, {
                boundsAutoApply: false,
                routeActiveStrokeWidth: 5,
                routeActiveStrokeColor: "#2563eb",
                routeActiveStrokeStyle: "solid",
            });
            mapRef.current.geoObjects.add(multiRouteRef.current);
        }
    }, []);

    // Xarita init — tanlangan buyurtma o'zgarganda markerlarni qayta chizish
    useEffect(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !ymapsLoaded) return;

        if (!mapRef.current) {
            ymaps.ready(() => {
                mapRef.current = new ymaps.Map('tracking-map', {
                    center: TERMEZ_CENTER,
                    zoom: 12,
                    controls: ['zoomControl', 'geolocationControl']
                });
                if (selectedOrder) updateMarkers(selectedOrder);
            });
        } else {
            updateMarkers(selectedOrder);
        }
    }, [ymapsLoaded, selectedOrder, updateMarkers]);

    if (loading) {
        return (
            <div className="container min-h-[70vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-slate-500">Buyurtmalar yuklanmoqda...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="container min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                    <PackageSearch size={36} className="text-blue-500" />
                </div>
                <h1 className="text-xl font-black text-slate-900">Faol buyurtmalar yo'q</h1>
                <p className="text-sm text-slate-500 max-w-sm">
                    Hozirda yetkazilayotgan buyurtmangiz yo'q. Buyurtma berganingizda kuryerni shu yerda
                    online kuzatishingiz mumkin.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                    Xaridni boshlash
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 pt-[70px]">
            <Script src={YANDEX_MAPS_URL} onLoad={() => setYmapsLoaded(true)} />

            {/* Xarita */}
            <div className="relative flex-1 min-h-[45vh] lg:h-auto order-2 lg:order-1">
                <div id="tracking-map" className="absolute inset-0 z-0" />
                {!ymapsLoaded && (
                    <div className="absolute inset-0 z-10 bg-slate-100 flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Buyurtmalar panel */}
            <div className="w-full lg:w-[420px] bg-white p-5 lg:p-6 shadow-2xl z-10 overflow-y-auto border-l border-slate-100 order-1 lg:order-2">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Yetkazishni kuzatish</h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {orders.length} ta faol buyurtma · {ymapsLoaded ? 'online' : 'yuklanmoqda'}
                        </p>
                    </div>
                    <button
                        onClick={() => router.refresh()}
                        className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Yangilash"
                        aria-label="Yangilash"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Buyurtmalar ro'yxati */}
                <div className="space-y-3 mb-5">
                    {orders.map((o) => {
                        const isSel = selectedOrder?.id === o.id;
                        return (
                            <button
                                key={o.id}
                                onClick={() => setSelectedId(o.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                    isSel
                                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                                        : 'bg-slate-50 border-slate-100 hover:border-blue-100'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-black text-slate-900 text-sm">
                                        Buyurtma #{o.id.slice(-6)}
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                        o.status === 'DELIVERING' || o.status === 'PICKED_UP'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {STATUS_LABEL[o.status] || o.status}
                                    </span>
                                </div>
                                {o.courierName && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <Truck size={13} className="text-blue-500" />
                                        <span className="font-semibold">{o.courierName}</span>
                                        {o.courierVehicle && (
                                            <span className="text-slate-400">· {o.courierVehicle}</span>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {o.shippingAddress || 'Manzil belgilanmagan'}
                                    </span>
                                    <ChevronRight size={14} className={`${isSel ? 'text-blue-500' : 'text-slate-300'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Tanlangan buyurtma detali */}
                {selectedOrder && (
                    <div className="space-y-4">
                        {selectedOrder.courierName && (
                            <div className="p-4 bg-slate-900 text-white rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                                        <User size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{selectedOrder.courierName}</p>
                                        <p className="text-[11px] text-slate-400">
                                            {selectedOrder.courierVehicle || 'Kuryer'} · {selectedOrder.courierLevel || 'BRONZE'}
                                        </p>
                                    </div>
                                    {selectedOrder.courierPhone && (
                                        <a
                                            href={`tel:${selectedOrder.courierPhone.replace(/\s/g, '')}`}
                                            className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                                            title="Qo'ng'iroq qilish"
                                            aria-label="Kuryerga qo'ng'iroq qilish"
                                        >
                                            <Phone size={18} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedOrder.courierLat != null && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 bg-slate-50 rounded-2xl">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Clock size={11} /> Joylashuv
                                    </span>
                                    <p className="font-black text-slate-900 text-sm mt-1">
                                        {selectedOrder.locationAgeSec == null
                                            ? 'Aniqlanmoqda'
                                            : selectedOrder.locationAgeSec < 120
                                                ? 'Yangi'
                                                : `${Math.round(selectedOrder.locationAgeSec / 60)} daqiqa oldin`}
                                    </p>
                                </div>
                                <div className="p-3.5 bg-slate-50 rounded-2xl">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={11} /> Manzil
                                    </span>
                                    <p className="font-black text-slate-900 text-sm mt-1 line-clamp-1">
                                        {selectedOrder.shippingAddress || '—'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {selectedOrder.store && (
                            <div className="p-3.5 bg-slate-50 rounded-2xl flex items-start gap-3">
                                <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Store size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Do'kon</p>
                                    <p className="font-bold text-slate-800 text-sm">{selectedOrder.store.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{selectedOrder.store.address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
