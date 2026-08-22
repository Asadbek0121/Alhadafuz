"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { YANDEX_MAPS_KEY } from "@/lib/maps";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useTranslations } from "next-intl";
import {
    Truck, MapPin, Phone, User, Store, Clock, ChevronRight, Navigation,
    PackageSearch, RefreshCw, CheckCircle2, AlertCircle, Loader2,
    Circle, CircleCheckBig, Filter, X, ChevronDown, ChevronUp,
    Timer, Route, Bike, Car, Footprints, ShieldCheck
} from "lucide-react";

const YANDEX_MAPS_URL = (key: string) =>
    `https://api-maps.yandex.ru/2.1/?lang=uz_UZ&apikey=${key}&coordorder=latlong&load=package.full`;
const TERMEZ_CENTER: [number, number] = [37.2272, 67.2752];

// === Types ===
interface TrackOrder {
    id: string; status: string; total: number; createdAt: string; updatedAt: string;
    orderLat: number | null; orderLng: number | null;
    shippingAddress?: string | null; shippingCity?: string | null; shippingDistrict?: string | null;
    courierName?: string | null; courierPhone?: string | null;
    courierLat?: number | null; courierLng?: number | null;
    courierVehicle?: string | null; courierLevel?: string | null;
    courierState?: string; courierLastLocation?: string | null;
    locationAgeSec?: number | null; etaMinutes?: number | null; distanceKm?: number | null;
    departedAt?: number | null;
    store?: { name: string; address: string; lat: number; lng: number } | null;
}

const ORDER_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
const STATUS_LABELS: Record<string, string> = {
    CREATED: "Kuryer qidirilmoqda", ASSIGNED: "Kuryer biriktirildi",
    PROCESSING: "Tayyorlanmoqda", PICKED_UP: "Kuryer yo'lga chiqdi",
    DELIVERING: "Yetkazilmoqda", DELIVERED: "Yetkazib berildi",
    COMPLETED: "Yakunlandi", CANCELLED: "Bekor qilindi",
};
const STATUS_ORDER = ['CREATED', 'ASSIGNED', 'PROCESSING', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'COMPLETED'];
const FILTER_OPTIONS = [
    { key: 'active', label: 'Faol' },
    { key: 'delivering', label: 'Yo\'lda' },
    { key: 'searching', label: 'Kuryer qidirilmoqda' },
    { key: 'delivered', label: 'Yetkazib berildi' },
    { key: 'all', label: 'Barchasi' },
];

function statusColor(s: string): string {
    if (s === 'DELIVERED' || s === 'COMPLETED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'DELIVERING') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s === 'PICKED_UP') return 'bg-teal-100 text-teal-700 border-teal-200';
    if (s === 'ASSIGNED') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (s === 'PROCESSING') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (s === 'CREATED') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (s === 'CANCELLED') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
}

function vehicleIcon(v?: string | null) {
    const vv = (v || '').toLowerCase();
    if (vv.includes('moto')) return <Truck size={16} />;
    if (vv.includes('velo') || vv.includes('bis')) return <Bike size={16} />;
    if (vv.includes('mash') || vv.includes('avto')) return <Car size={16} />;
    return <Footprints size={16} />;
}

function timeAgo(ms: number | null | undefined): string {
    if (ms == null) return '';
    const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}min`;
    return `${Math.round(min / 60)}h`;
}

export default function DeliveryPage() {
    const t = useTranslations('Profile');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState<TrackOrder[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('active');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ymapsLoaded, setYmapsLoaded] = useState(false);
    const [showMobilePanel, setShowMobilePanel] = useState(true);

    const mapRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const multiRouteRef = useRef<any>(null);
    const animFrameRef = useRef<number | null>(null);

    // Yandex Maps script loaded already
    useEffect(() => {
        const check = () => {
            if ((window as any).ymaps) { setYmapsLoaded(true); return; }
            setTimeout(check, 500);
        };
        if ((window as any).ymaps) setYmapsLoaded(true);
        else check();
    }, []);

    // Polling orders
    useEffect(() => {
        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        const fetchOrders = async () => {
            try {
                const res = await fetch(`/api/orders/tracking?scope=${filter === 'delivered' || filter === 'all' ? 'all' : 'active'}`, { cache: 'no-store' });
                if (res.status === 401) { router.push('/?auth=login&callbackUrl=/delivery'); return; }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (cancelled) return;
                let list = data.orders || [];
                // Client-side filter
                if (filter === 'delivering') list = list.filter((o: TrackOrder) => o.status === 'PICKED_UP' || o.status === 'DELIVERING');
                if (filter === 'searching') list = list.filter((o: TrackOrder) => o.status === 'CREATED' || o.status === 'ASSIGNED');
                if (filter === 'delivered') list = list.filter((o: TrackOrder) => o.status === 'DELIVERED' || o.status === 'COMPLETED');
                if (filter === 'active') list = list.filter((o: TrackOrder) => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status));
                setOrders(list);
                setError(null);
                // Auto-select: URL'da ?order= bo'lsa shu, aks holda birinchi
                if (list.length > 0) {
                    const urlOrderId = searchParams.get('order');
                    if (urlOrderId && list.some((o: TrackOrder) => o.id === urlOrderId)) {
                        setSelectedIds(new Set([urlOrderId]));
                    } else if (selectedIds.size === 0) {
                        setSelectedIds(new Set([list[0].id]));
                    }
                }
            } catch (e) {
                if (cancelled) return;
                setError("Ma'lumot yuklanmadi");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchOrders();
        interval = setInterval(fetchOrders, 8000);
        return () => { cancelled = true; if (interval) clearInterval(interval); };
    }, [router, filter, searchParams]);

    const toggleOrder = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next.size > 0 ? next : new Set([id]);
        });
    };

    const selectedList = useMemo(() => orders.filter(o => selectedIds.has(o.id)), [orders, selectedIds]);
    // updateMarkers stable bo'lishi uchun (deps: []) — polling'da qayta
    // yaratilmasin va init effect faqat bir marta ishlasin.
    const selectedListRef = useRef(selectedList);
    selectedListRef.current = selectedList;

    // ── Map markers ──
    // shouldFit=false: polling'da markerlarni yangilaydi, lekin xaritani
    // zoom qilmaydi (foydalanuvchi qo'lda zoom qilganini saqlaydi).
    // shouldFit=true: order tanlanganda/birinchi yuklashda bounds'ga zoom.
    const updateMarkers = useCallback((shouldFit = false) => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapRef.current) return;

        // Clear old markers & routes
        markersRef.current.forEach(m => mapRef.current.geoObjects.remove(m));
        markersRef.current = new Map();
        if (multiRouteRef.current) { mapRef.current.geoObjects.remove(multiRouteRef.current); multiRouteRef.current = null; }

        const selectedList = selectedListRef.current;
        if (selectedList.length === 0) return;

        // Show selected orders on map
        const bounds: number[][] = [];

        selectedList.forEach((order, idx) => {
            const color = ORDER_COLORS[idx % ORDER_COLORS.length];
            const hasStore = order.store?.lat != null;
            const hasCourier = order.courierLat != null && order.courierState === 'ONLINE';
            const hasDest = order.orderLat != null;

            // Store
            if (hasStore && order.store) {
                const m = new ymaps.Placemark([order.store.lat, order.store.lng],
                    { balloonContent: order.store.name },
                    { preset: 'islands#blueHomeIcon', iconColor: color });
                mapRef.current.geoObjects.add(m);
                markersRef.current.set(`store-${order.id}`, m);
                bounds.push([order.store.lat, order.store.lng]);
            }

            // Courier
            if (hasCourier) {
                const m = new ymaps.Placemark([order.courierLat!, order.courierLng!],
                    { hintContent: order.courierName || 'Kuryer' },
                    { preset: 'islands#redTransportIcon', iconColor: color });
                mapRef.current.geoObjects.add(m);
                markersRef.current.set(`courier-${order.id}`, m);
                bounds.push([order.courierLat!, order.courierLng!]);
            }

            // Destination
            if (hasDest) {
                const m = new ymaps.Placemark([order.orderLat!, order.orderLng!],
                    { hintContent: 'Manzil' },
                    { preset: 'islands#greenDotIcon', iconColor: color });
                mapRef.current.geoObjects.add(m);
                markersRef.current.set(`dest-${order.id}`, m);
                bounds.push([order.orderLat!, order.orderLng!]);
            }

            // Route for single selected order — boundsAutoApply:false shart,
            // aks holda marshrut butun ekranga sig'dirilib zoom kichrayadi.
            if (selectedList.length === 1 && hasStore && order.store && hasDest) {
                const refs: any[] = [[order.store.lat, order.store.lng]];
                if (hasCourier) refs.push([order.courierLat!, order.courierLng!]);
                refs.push([order.orderLat!, order.orderLng!]);
                multiRouteRef.current = new ymaps.multiRouter.MultiRoute({
                    referencePoints: refs, params: { routingMode: 'auto' }
                }, {
                    routeActiveStrokeWidth: 5, routeActiveStrokeColor: color,
                    boundsAutoApply: false,
                });
                mapRef.current.geoObjects.add(multiRouteRef.current);
            }
        });

        // Fit bounds — checkZoomRange:false shart, aks holda Yandex zoom'ni
        // viewport chegarasiga sig'dirib kichraytirib qo'yadi. Buni FAQAT
        // order tanlanganda bajarish kerak (marker yangilanishida emas) —
        // aks holda foydalanuvchining qo'lda qilgan zoomi bekor bo'ladi.
        if (bounds.length > 0 && shouldFit) {
            mapRef.current.setBounds(bounds, {
                checkZoomRange: false,
                zoomMargin: 40,
                preciseZoom: true,
            });
        }
    }, []);

    // Init map — div DOM'da mavjud bo'lgandagina. Yandex script erta yuklansa
    // (loading/empty holatda div hali render bo'lmagan) null.offsetWidth xatosi
    // berardi. Endi div doim render qilinadi (quyida) — shuning uchun xavfsiz.
    useEffect(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !ymapsLoaded) return;
        if (!mapRef.current) {
            ymaps.ready(() => {
                const el = document.getElementById('delivery-dashboard-map');
                if (!el || !el.offsetWidth) return; // hali mavjud emas — keyingi effect'da
                mapRef.current = new ymaps.Map(el, {
                    center: TERMEZ_CENTER, zoom: 12,
                    controls: ['zoomControl'],
                });
                updateMarkers(true); // birinchi yuklashda order'ga zoom
            });
        } else {
            updateMarkers(true); // init'dan keyin ham tanlangan order'ga zoom
        }
    }, [ymapsLoaded, updateMarkers]);

    // Order tanlanganda (selectedIds o'zgarganda) xaritani shu order'ga zoom qilish.
    // Polling (orders yangilanishi) bu effect'ni ishga tushirmaydi — faqat
    // foydalanuvchi boshqa order tanlaganda zoom qilinadi.
    const ordersRef = useRef(orders);
    ordersRef.current = orders;
    const selectedIdsKey = useMemo(() => Array.from(selectedIds).sort().join(','), [selectedIds]);
    useEffect(() => {
        if (mapRef.current && selectedIdsKey) {
            const hasOrders = ordersRef.current.some(o => selectedIds.has(o.id));
            if (hasOrders) updateMarkers(true);
        }
    }, [selectedIdsKey, ymapsLoaded, updateMarkers]);

    // ── Render: map div DOIM render qilinadi, panel holatga qarab ──
    return (
        <div className="relative flex flex-col lg:flex-row min-h-screen bg-slate-50">
            <Script src={YANDEX_MAPS_URL(YANDEX_MAPS_KEY)} onLoad={() => setYmapsLoaded(true)} />

            {/* MAP — doim render, loading/empty holatda ham Termizni ko'rsatadi */}
            <div className="relative flex-1 min-h-[50vh] lg:min-h-screen lg:w-[60%] order-2 lg:order-1">
                <div id="delivery-dashboard-map" className="absolute inset-0 z-0" />
                {!ymapsLoaded && (
                    <div className="absolute inset-0 z-10 bg-slate-100 flex items-center justify-center">
                        <Loader2 size={28} className="animate-spin text-blue-600" />
                    </div>
                )}
                {/* Mobile toggle panel button */}
                <button
                    onClick={() => setShowMobilePanel(v => !v)}
                    className="lg:hidden absolute top-4 left-4 z-10 bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2 font-bold text-sm"
                >
                    {showMobilePanel ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    {selectedIds.size} ta buyurtma
                </button>
            </div>

            {/* PANEL */}
            <div className={`w-full lg:w-[40%] lg:max-w-[460px] bg-white shadow-2xl z-10 flex flex-col order-1 lg:order-2
                ${showMobilePanel ? 'max-h-[55vh] lg:max-h-screen' : 'max-h-0 lg:max-h-screen'} overflow-hidden transition-all duration-300`}>
                
                {/* Header + Filters */}
                <div className="shrink-0 border-b border-slate-100">
                    <div className="px-4 sm:px-5 pt-4 pb-3">
                        <div className="flex items-center justify-between mb-2">
                            <h1 className="text-lg font-black text-slate-900">Mening yetkazib berishlarim</h1>
                            <span className="text-[11px] font-bold text-slate-400">{orders.length} ta</span>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {FILTER_OPTIONS.map(f => (
                                <button key={f.key}
                                    onClick={() => { setFilter(f.key); setSelectedIds(new Set()); }}
                                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${
                                        filter === f.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Order List */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3 space-y-2.5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-xs font-semibold border border-amber-200">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium">Yetkazib berishlar yuklanmoqda...</p>
                        </div>
                    )}
                    {!loading && orders.length === 0 && (
                        <div className="text-center py-12 space-y-3">
                            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                                <PackageSearch size={24} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800">Faol yetkazib berishlar yo'q</p>
                                <p className="text-xs text-slate-400 mt-0.5">Buyurtma berganingizda kuryerni shu yerda kuzatasiz.</p>
                            </div>
                            <button onClick={() => router.push('/')} className="mt-1 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700">
                                Xaridni boshlash
                            </button>
                        </div>
                    )}
                    {!loading && orders.map((order, idx) => {
                        const isSel = selectedIds.has(order.id);
                        return (
                            <div key={order.id}
                                className={`rounded-2xl border-2 transition-all cursor-pointer ${
                                    isSel ? 'border-blue-500 bg-blue-50/30 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'
                                }`}
                                onClick={() => {
                                    setSelectedIds(new Set([order.id]));
                                    setShowMobilePanel(false);
                                }}
                            >
                                {/* Checkbox + Title row */}
                                <div className="p-3.5 pb-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0"
                                            onClick={(e) => { e.stopPropagation(); toggleOrder(order.id); }}>
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                isSel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                            }`}>
                                                {isSel && <CheckCircle2 size={14} className="text-white" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-sm text-slate-900">#{order.id.slice(-6).toUpperCase()}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {new Date(order.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor(order.status)}`}>
                                            {STATUS_LABELS[order.status] || order.status}
                                        </span>
                                    </div>

                                    {/* ETA + Distance row */}
                                    {(order.etaMinutes != null || order.courierName) && (
                                        <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600">
                                            {order.courierName && (
                                                <span className="flex items-center gap-1 font-semibold">
                                                    <Truck size={13} className="text-blue-500" /> {order.courierName}
                                                </span>
                                            )}
                                            {order.etaMinutes != null && (
                                                <span className="flex items-center gap-1">
                                                    <Timer size={13} className="text-amber-500" /> ~{order.etaMinutes} min
                                                </span>
                                            )}
                                            {order.distanceKm != null && (
                                                <span className="text-slate-400">{order.distanceKm} km</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {orders.length > 0 && <div className="h-4" />}
                </div>

                {/* Selected order detail (bottom panel) */}
                {selectedList.length === 1 && selectedList[0].courierName && (
                    <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                    <User size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-900">{selectedList[0].courierName}</p>
                                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                        {vehicleIcon(selectedList[0].courierVehicle)}
                                        {selectedList[0].courierVehicle || 'Kuryer'} · {selectedList[0].courierLevel || 'BRONZE'}
                                    </p>
                                </div>
                            </div>
                            {selectedList[0].courierPhone && (
                                <a href={`tel:${selectedList[0].courierPhone?.replace(/\s/g, '')}`}
                                    className="p-2.5 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                                    title="Qo'ng'iroq qilish">
                                    <Phone size={18} />
                                </a>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase">ETA</p>
                                <p className="font-black text-sm text-slate-900">{selectedList[0].etaMinutes != null ? `~${selectedList[0].etaMinutes} min` : '—'}</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Masofa</p>
                                <p className="font-black text-sm text-slate-900">{selectedList[0].distanceKm != null ? `${selectedList[0].distanceKm} km` : '—'}</p>
                            </div>
                            <div className="p-2.5 bg-white rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase">Yo'lda</p>
                                <p className="font-black text-sm text-slate-900">{selectedList[0].departedAt ? timeAgo(selectedList[0].departedAt) : '—'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
