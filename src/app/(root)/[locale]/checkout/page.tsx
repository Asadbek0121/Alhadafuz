
"use client";

import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import { CreditCard, Truck, MapPin, Banknote, ShieldAlert, Loader2, Edit2, CheckCircle2, Tag, XCircle, Store, Building, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { PhoneInput } from '@/components/ui/phone-input';
import { regions, districts } from '@/constants/locations';
import { useMessages } from 'next-intl';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/store/useMapStore';
import { useLocationStore } from '@/store/useLocationStore';

export default function CheckoutPage() {
    const { items, total, clearCart } = useCartStore();
    const { user, isAuthenticated, openAuthModal } = useUserStore();
    const tCheckout = useTranslations('Checkout');
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const tProfile = useTranslations('Profile');
    const messages = useMessages() as any;
    const router = useRouter();
    const { openMap } = useMapStore();
    const locationState = useLocationStore();

    const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
    const [stores, setStores] = useState<any[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [isMethodsLoading, setIsMethodsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Shipping Zones State
    const [shippingZones, setShippingZones] = useState<any[]>([]);
    const [deliveryFee, setDeliveryFee] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        name: user?.name || '',
        city: 'toshkent_sh',
        district: '',
        address: '',
        comment: '',
    });

    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [saveNewAddress, setSaveNewAddress] = useState(false);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState<string | null>(null);

    const addressFormRef = useRef<HTMLDivElement>(null);
    const citySelectRef = useRef<HTMLSelectElement>(null);

    const applyCoupon = async () => {
        if (!couponCode) return;
        setIsApplyingCoupon(true);
        setCouponError(null);
        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode, amount: total() })
            });
            const data = await res.json();
            if (res.ok) {
                setAppliedCoupon(data);
                toast.success("Promo kod muvaffaqiyatli qo'llanildi");
            } else {
                setCouponError(data.error);
                setAppliedCoupon(null);
            }
        } catch (err) {
            setCouponError("Xatolik yuz berdi");
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    // Safe translation helper
    const safeTranslate = (key: string) => {
        if (!key) return '';
        const locationMessages = messages?.Locations;
        if (locationMessages && locationMessages[key]) {
            return locationMessages[key];
        }
        return key;
    };

    const selectAddress = (addr: any) => {
        setSelectedAddressId(addr.id);
        setFormData(prev => ({
            ...prev,
            city: addr.city,
            district: addr.district || '',
            address: addr.street + (addr.house ? `, ${addr.house}` : '') + (addr.apartment ? `, ${addr.apartment}` : ''),
        }));
    };

    // Update form when map location changes
    useEffect(() => {
        if (locationState.address || locationState.city) {
            let newCityId = ''; // Start clean!
            let newDistrict = '';

            // Helper to normalize strings
            const normalize = (str: string) => str.toLowerCase()
                .replace(/[\u2018\u2019\u201B\u2032\u2035`'ʻ]/g, "'")
                .trim();

            // 1. Match Region/City
            if (locationState.city) {
                const searchCity = normalize(locationState.city);

                // Explicit keywords mapping
                const keywordMap: { [key: string]: string } = {
                    'toshkent sh': 'toshkent_sh',
                    'toshkent vil': 'toshkent_vil',
                    'andijon': 'andijon',
                    'buxoro': 'buxoro',
                    'farg': 'fargona',
                    'jizzax': 'jizzax',
                    'namangan': 'namangan',
                    'navoiy': 'navoiy',
                    'qashqadaryo': 'qashqadaryo',
                    'qoraqalpo': 'qoraqalpogiston',
                    'samarqand': 'samarqand',
                    'sirdaryo': 'sirdaryo',
                    'surxondaryo': 'surxondaryo',
                    'xorazm': 'xorazm'
                };

                // Check keywords
                for (const [key, id] of Object.entries(keywordMap)) {
                    if (searchCity.includes(key)) {
                        if (key.includes('toshkent')) {
                            if (searchCity.includes('viloyat')) {
                                newCityId = 'toshkent_vil';
                            } else {
                                newCityId = 'toshkent_sh';
                            }
                        } else {
                            newCityId = id;
                        }
                        break;
                    }
                }

                // Fallback fuzzy match
                if (!newCityId) {
                    const matchedRegion = regions.find(r =>
                        searchCity.includes(normalize(r.name)) ||
                        normalize(r.name).includes(searchCity)
                    );
                    if (matchedRegion) newCityId = matchedRegion.id;
                }
            }

            // Keep existing city only if no match found AND no new city determined
            if (!newCityId) newCityId = formData.city;

            // 2. Match District
            if (newCityId && locationState.district) {
                const availableDistricts = districts[newCityId] || [];
                const searchDistrict = normalize(locationState.district);

                const matchedDistrict = availableDistricts.find(d => {
                    const normD = normalize(d);
                    return normD === searchDistrict ||
                        searchDistrict.includes(normD) ||
                        normD.includes(searchDistrict);
                });

                if (matchedDistrict) {
                    newDistrict = matchedDistrict;
                }
            }

            setFormData(prev => ({
                ...prev,
                city: newCityId,
                district: newDistrict,
                address: locationState.address || prev.address
            }));
        }
    }, [locationState.address, locationState.city, locationState.district]);

    // 1. Fetch Methods and Zones
    useEffect(() => {
        const fetchMethods = async () => {
            try {
                const res = await fetch('/api/payment-methods');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setPaymentMethods(data);
                        setPaymentMethod(data[0].provider);
                    } else {
                        // Fallback if DB is empty
                        const fallbacks = [
                            { id: 'cash', name: 'Naqd pul', provider: 'cash', isActive: true },
                            { id: 'card', name: "Karta orqali", provider: 'humo_uzcard', isActive: true }
                        ];
                        setPaymentMethods(fallbacks);
                        setPaymentMethod(fallbacks[0].provider);
                    }
                } else {
                    const fallbacks = [
                        { id: 'cash', name: 'Naqd pul', provider: 'cash', isActive: true }
                    ];
                    setPaymentMethods(fallbacks);
                    setPaymentMethod(fallbacks[0].provider);
                }
            } catch (err) {
                console.error("Failed to fetch payment methods", err);
                setPaymentMethods([{ id: 'cash', name: 'Naqd pul', provider: 'cash', isActive: true }]);
                setPaymentMethod('cash');
            } finally {
                setIsMethodsLoading(false);
            }
        };

        const fetchZones = async () => {
            try {
                const res = await fetch('/api/admin/shipping');
                if (res.ok) {
                    const data = await res.json();
                    setShippingZones(data.filter((z: any) => z.isActive));
                }
            } catch (err) {
                console.error("Failed to fetch shipping zones", err);
            }
        };

        fetchMethods();
        fetchZones();
    }, []);

    // 1.5 Fetch Stores when Olib ketish is selected
    useEffect(() => {
        if (deliveryMethod === 'pickup' && stores.length === 0) {
            const fetchStores = async () => {
                setIsLoadingStores(true);
                try {
                    const res = await fetch('/api/stores');
                    if (res.ok) {
                        const data = await res.json();
                        setStores(data);
                        if (data.length > 0 && !selectedStoreId) {
                            setSelectedStoreId(data[0].id);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch stores", err);
                } finally {
                    setIsLoadingStores(false);
                }
            };
            fetchStores();
        }
    }, [deliveryMethod, stores.length, selectedStoreId]);

    // 2. Auth/Cart check and Addresses
    useEffect(() => {
        if (items.length === 0) {
            router.replace('/');
            return;
        }

        if (isAuthenticated) {
            fetch('/api/addresses')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSavedAddresses(data);
                        const def = data.find((a: any) => a.isDefault);
                        if (def) selectAddress(def);
                    }
                })
                .catch(err => console.error(err));
        }
    }, [items.length, router, isAuthenticated]);

    // 3. Dynamic Delivery Fee Calculation
    useEffect(() => {
        if (deliveryMethod === 'pickup') {
            setDeliveryFee(0);
            return;
        }

        // According to user request: Show 0 until district is selected
        if (!formData.district) {
            setDeliveryFee(0);
            return;
        }

        const currentTotal = total();
        const cityName = safeTranslate(formData.city);

        // Try to find a specific zone for this district first
        let selectedZone = shippingZones.find(z =>
            (z.name === cityName || z.name === formData.city) &&
            z.district === formData.district
        );

        // If no district zone, fall back to the city/region zone
        if (!selectedZone) {
            selectedZone = shippingZones.find(z =>
                (z.name === cityName || z.name === formData.city) &&
                (!z.district || z.district === "")
            );
        }

        if (selectedZone) {
            // Admin Conditions for Free Shipping
            const isTotalFree = selectedZone.freeFrom && currentTotal >= selectedZone.freeFrom;

            const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
            const isQtyFree = selectedZone.freeFromQty && totalQty >= selectedZone.freeFromQty;

            const isDiscountFree = selectedZone.freeIfHasDiscount && items.some(item => {
                const cartItem = item as any;
                if (!cartItem.hasDiscount) return false;
                if (!selectedZone.freeDiscountType || selectedZone.freeDiscountType === 'ANY') return true;
                return cartItem.discountType === selectedZone.freeDiscountType;
            });

            if (isTotalFree || isDiscountFree || isQtyFree) {
                setDeliveryFee(0);
            } else {
                setDeliveryFee(selectedZone.price);
            }
        } else {
            // Default if no zone matches
            setDeliveryFee(0);
        }
    }, [formData.city, formData.district, deliveryMethod, shippingZones, total, items]);

    if (items.length === 0) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAuthenticated) {
            openAuthModal();
            return;
        }

        setIsProcessing(true);
        setError(null);

        if (!paymentMethod) {
            setError("Iltimos, to'lov turini tanlang");
            setIsProcessing(false);
            return;
        }

        try {
            if (saveNewAddress && !selectedAddressId) {
                try {
                    await fetch('/api/addresses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: tProfile('my_address'),
                            city: formData.city,
                            district: formData.district,
                            street: formData.address,
                        })
                    });
                } catch (e) {
                    console.error("Failed to save address", e);
                }
            }

            const cityName = safeTranslate(formData.city);

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map(item => ({
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                    })),
                    total: total() + deliveryFee - (appliedCoupon?.discountAmount || 0),
                    paymentMethod,
                    deliveryMethod,
                    couponCode: appliedCoupon?.code,
                    discountAmount: appliedCoupon?.discountAmount || 0,
                    deliveryAddress: {
                        city: cityName,
                        district: formData.district,
                        address: formData.address,
                        comment: formData.comment,
                        phone: formData.phone,
                        name: formData.name,
                    },
                    lat: locationState?.lat,
                    lng: locationState?.lng,
                    storeId: deliveryMethod === 'pickup' ? selectedStoreId : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const detailMsg = data.details
                    ? `: ${Object.keys(data.details).map(k => `${k}: ${JSON.stringify(data.details[k])}`).join(', ')}`
                    : '';
                throw new Error((data.error || 'Server xatoligi') + detailMsg);
            }

            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
                clearCart();
                return;
            }

            clearCart();
            router.push(`/order-success?orderId=${data.order.id}`);
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="min-h-screen bg-[#fafafb] pb-24 md:pb-12">
            {/* Unified Checkout Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 z-[100] transition-all shadow-sm">
                <div className="container max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-5">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="p-1.5 md:p-2 bg-white border border-slate-200 rounded-xl shadow-sm active:scale-95 transition-all hover:bg-slate-50 group"
                        >
                            <ChevronLeft size={18} className="text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-[14px] sm:text-[16px] md:text-xl font-black text-slate-900 tracking-tight leading-none">{tCart('checkout')}</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 hidden md:block">Xavfsiz to'lov tizimi</p>
                        </div>
                    </div>

                    <Link href="/" className="flex items-center group gap-0">
                        <img src="/logo.png" alt="Hadaf Logo" className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-transform group-hover:scale-105" />
                        <div className="flex flex-col -ml-1 md:-ml-2">
                            <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter leading-none text-[#0052FF] uppercase">Hadaf</span>
                            <span className="text-[8px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] text-blue-500/80 uppercase mt-[-1px] md:mt-[-2px] ml-0.5">Market</span>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-4 py-6 md:py-12">

                <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                    {/* Main Content */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Error Banner */}
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                                <ShieldAlert size={20} className="shrink-0" />
                                <span className="font-medium text-sm">{error}</span>
                            </div>
                        )}



                        {/* Step 1: Contact Info */}
                        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-[24px] border border-slate-100 shadow-sm transition-all focus-within:shadow-md">
                            <div className="flex items-center gap-2.5 mb-5 pl-0.5">
                                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-blue-500/10">1</div>
                                <h2 className="text-[14px] sm:text-[16px] md:text-xl font-black text-slate-900 tracking-tight uppercase tracking-wider leading-none">{tCheckout('contact_info')}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest pl-1">{tCheckout('phone_label')}</label>
                                    <PhoneInput
                                        value={formData.phone}
                                        onChange={(val) => setFormData({ ...formData, phone: val })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 md:py-3.5 outline-none focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all font-bold text-slate-900 text-[13px] md:text-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest pl-1">{tCheckout('name_label')}</label>
                                    <input
                                        type="text"
                                        placeholder={tCheckout('name_placeholder')}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 md:py-4 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900 text-[13px] md:text-sm placeholder:text-slate-300"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Step 2: Delivery */}
                        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-[24px] border border-slate-100 shadow-sm transition-all">
                            <div className="flex items-center gap-2.5 mb-5 pl-0.5">
                                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-blue-500/10">2</div>
                                <h2 className="text-[14px] sm:text-[16px] md:text-xl font-black text-slate-900 tracking-tight uppercase tracking-wider leading-none">{tCheckout('delivery_method')}</h2>
                            </div>

                            <div className="flex gap-2 mb-5 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
                                <button
                                    type="button"
                                    className={`flex-1 py-2.5 px-2 md:px-4 rounded-lg text-[10px] sm:text-[11px] md:text-xs font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all duration-300 whitespace-nowrap ${deliveryMethod === 'courier' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setDeliveryMethod('courier')}
                                >
                                    <Truck size={14} className="shrink-0" /> {tCheckout('courier')}
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-2.5 px-2 md:px-4 rounded-lg text-[10px] sm:text-[11px] md:text-xs font-black flex items-center justify-center gap-1.5 md:gap-2 transition-all duration-300 whitespace-nowrap ${deliveryMethod === 'pickup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    onClick={() => setDeliveryMethod('pickup')}
                                >
                                    <MapPin size={14} className="shrink-0" /> {tCheckout('pickup')}
                                </button>
                            </div>

                            {deliveryMethod === 'courier' ? (
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    {/* Saved Addresses */}
                                    {savedAddresses.length > 0 && (
                                        <div className="mb-2">
                                            <label className="block text-[10px] font-black text-slate-900 mb-3 pl-1 uppercase tracking-wider">
                                                {tCheckout('saved_addresses')}
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {savedAddresses.map(addr => (
                                                    <div
                                                        key={addr.id}
                                                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all relative ${selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-50 hover:border-slate-200 bg-slate-50/30'}`}
                                                        onClick={() => selectAddress(addr)}
                                                    >
                                                        {selectedAddressId === addr.id && <div className="absolute top-3 right-3 text-blue-600"><CheckCircle2 size={14} /></div>}
                                                        <div className="font-bold text-[11px] text-slate-900 mb-1 uppercase tracking-tight">
                                                            {(addr.title === "My Address" || addr.title === "Mening manzilim" || addr.title === "Мой адрес")
                                                                ? tProfile('my_address')
                                                                : (addr.title || tCheckout('address'))}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                                            {safeTranslate(addr.city)}, {safeTranslate(addr.district)} <br />
                                                            {addr.street} {addr.house}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div
                                                    className={`cursor-pointer p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all ${selectedAddressId === null ? 'bg-slate-50/50' : ''}`}
                                                    onClick={() => {
                                                        setSelectedAddressId(null);
                                                        setFormData(prev => ({ ...prev, address: '', district: '', city: 'toshkent_sh' }));
                                                        setTimeout(() => {
                                                            addressFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            citySelectRef.current?.focus();
                                                        }, 100);
                                                    }}
                                                >
                                                    <span className="font-black text-xs uppercase tracking-tight">+ {tCheckout('new_address')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Viloyat and Tuman Selects */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={addressFormRef}>
                                        <div className="col-span-1 md:col-span-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={openMap}
                                                className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100"
                                            >
                                                <MapPin size={14} />
                                                <span className="uppercase tracking-wide text-[10px]">Xaritadan tanlash</span>
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest pl-1">{tCheckout('city_label')}</label>
                                            <div className="relative group">
                                                <select
                                                    ref={citySelectRef}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 md:py-4 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900 text-[13px] md:text-sm appearance-none cursor-pointer"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value, district: '' })}
                                                >
                                                    {regions.map((region) => (
                                                        <option key={region.id} value={region.id}>{safeTranslate(region.id)}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                    <ChevronRight size={16} className="rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest pl-1">{tCheckout('district_label')}</label>
                                            <div className="relative group">
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 md:py-4 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900 text-[13px] md:text-sm appearance-none cursor-pointer disabled:opacity-50"
                                                    value={formData.district}
                                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                                    disabled={!formData.city}
                                                >
                                                    <option value="">{tCheckout('district_select')}</option>
                                                    {(districts[formData.city] || []).map((dist) => (
                                                        <option key={dist} value={dist}>{safeTranslate(dist)}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                                    <ChevronRight size={16} className="rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest pl-1">{tCheckout('address_label')}</label>
                                        <input
                                            type="text"
                                            placeholder={tCheckout('address_placeholder')}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 md:py-4 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900 text-[13px] md:text-sm placeholder:text-slate-300"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {!selectedAddressId && (
                                        <div className="flex items-center gap-3 py-1">
                                            <input
                                                type="checkbox"
                                                id="saveAddr"
                                                checked={saveNewAddress}
                                                onChange={(e) => setSaveNewAddress(e.target.checked)}
                                                className="w-5 h-5 border-2 border-slate-200 rounded-lg text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer"
                                            />
                                            <label htmlFor="saveAddr" className="text-xs font-bold cursor-pointer text-slate-600">
                                                {tCheckout('save_this_for_later')}
                                            </label>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest pl-1">{tCheckout('comment_label')}</label>
                                        <textarea
                                            placeholder={tCheckout('comment_placeholder')}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 md:py-4 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900 text-[13px] md:text-sm min-h-[100px] placeholder:text-slate-300 resize-none"
                                            value={formData.comment}
                                            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 animate-fade-in">
                                    <label className="block text-[10px] font-black text-slate-900 mb-1 pl-1 uppercase tracking-widest">
                                        {tCheckout('select_store')}
                                    </label>
                                    {isLoadingStores ? (
                                        <div className="flex justify-center py-6">
                                            <Loader2 className="animate-spin text-blue-600" />
                                        </div>
                                    ) : stores.length === 0 ? (
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-600 text-sm">
                                            {tCheckout('pickup_info')}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {stores.map(store => (
                                                <div
                                                    key={store.id}
                                                    className={`cursor-pointer p-4 rounded-[20px] border-2 transition-all relative ${selectedStoreId === store.id ? 'border-blue-600 bg-blue-50/30' : 'border-slate-50 bg-slate-50/50'}`}
                                                    onClick={() => setSelectedStoreId(store.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${selectedStoreId === store.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                            <Store size={20} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="font-black text-slate-900 text-sm">{store.name}</div>
                                                                {selectedStoreId === store.id && <CheckCircle2 size={16} className="text-blue-600" />}
                                                            </div>
                                                            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 font-bold mb-2">
                                                                <MapPin size={12} className="mt-0.5 shrink-0" />
                                                                <span className="line-clamp-1">{store.address}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <a
                                                                    href={store.lat && store.lng ? `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-black text-[10px] bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm transition-all"
                                                                >
                                                                    <MapPin size={10} />
                                                                    <span>{tCheckout('show_on_map')}</span>
                                                                </a>
                                                                {store.workingHours && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100/50 px-2 py-1 rounded-lg">
                                                                        <Clock size={10} />
                                                                        <span>{store.workingHours}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Step 3: Payment */}
                        <section className="bg-white p-5 sm:p-7 md:p-8 rounded-[24px] border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2.5 mb-5 pl-0.5">
                                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-blue-500/10">3</div>
                                <h2 className="text-[14px] sm:text-[16px] md:text-xl font-black text-slate-900 tracking-tight uppercase tracking-wider leading-none">{tCheckout('payment_type')}</h2>
                            </div>

                            {isMethodsLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-blue-600" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {(paymentMethods.length === 0 ? [
                                        { id: 'fallback-cash', name: tCheckout('cash'), provider: 'CASH' },
                                        { id: 'fallback-card', name: tCheckout('card'), provider: 'CARD' }
                                    ] : paymentMethods).map((method) => {
                                        const isSelected = paymentMethod === method.provider;
                                        let Icon = CreditCard;
                                        let colorClass = "text-slate-400"; // Default muted
                                        let bgClass = "bg-white";
                                        let borderClass = "border-slate-100";
                                        let shadowClass = "";

                                        // Normalize provider for styling check
                                        const providerUpper = (method.provider || '').toUpperCase();

                                        switch (providerUpper) {
                                            case 'CLICK':
                                                colorClass = isSelected ? "text-[#0085db]" : "text-slate-400 group-hover:text-[#0085db]";
                                                if (isSelected) { bgClass = "bg-[#0085db]/10"; borderClass = "border-[#0085db]"; shadowClass = "shadow-lg shadow-[#0085db]/10"; }
                                                break;
                                            case 'PAYME':
                                                colorClass = isSelected ? "text-[#00c1af]" : "text-slate-400 group-hover:text-[#00c1af]";
                                                if (isSelected) { bgClass = "bg-[#00c1af]/10"; borderClass = "border-[#00c1af]"; shadowClass = "shadow-lg shadow-[#00c1af]/10"; }
                                                break;
                                            case 'UZUM':
                                                colorClass = isSelected ? "text-[#7000ff]" : "text-slate-400 group-hover:text-[#7000ff]";
                                                if (isSelected) { bgClass = "bg-[#7000ff]/10"; borderClass = "border-[#7000ff]"; shadowClass = "shadow-lg shadow-[#7000ff]/10"; }
                                                break;
                                            case 'CASH':
                                                Icon = Banknote;
                                                colorClass = isSelected ? "text-amber-500" : "text-slate-400 group-hover:text-amber-500";
                                                if (isSelected) { bgClass = "bg-amber-50"; borderClass = "border-amber-500"; shadowClass = "shadow-lg shadow-amber-500/10"; }
                                                break;
                                            case 'CARD':
                                            case 'HUMO_UZCARD':
                                                colorClass = isSelected ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500";
                                                if (isSelected) { bgClass = "bg-blue-50"; borderClass = "border-blue-500"; shadowClass = "shadow-lg shadow-blue-500/10"; }
                                                break;
                                            default:
                                                if (isSelected) { bgClass = "bg-slate-100"; borderClass = "border-slate-900"; colorClass = "text-slate-900"; }
                                        }

                                        return (
                                            <div
                                                key={method.id}
                                                className={cn(
                                                    "group cursor-pointer p-4 rounded-[22px] border-2 flex flex-col items-center justify-center gap-3 aspect-[4/3] transition-all duration-300 relative overflow-hidden",
                                                    isSelected ? `${borderClass} ${bgClass} ${shadowClass} scale-[1.02]` : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
                                                )}
                                                onClick={() => setPaymentMethod(method.provider)}
                                            >
                                                {/* Checkmark for selected */}
                                                {isSelected && (
                                                    <div className="absolute top-3 right-3 animate-scale-in">
                                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", colorClass.replace('text-', 'bg-'))}>
                                                            <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={cn("p-3 rounded-2xl transition-all duration-300", isSelected ? "bg-white shadow-sm scale-110" : "bg-slate-50 group-hover:bg-white group-hover:shadow-sm")}>
                                                    <Icon size={28} className={cn("transition-colors duration-300", colorClass)} />
                                                </div>
                                                <span className={cn("font-black text-[10px] sm:text-[11px] text-center uppercase tracking-widest leading-none transition-colors duration-300", isSelected ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")}>{method.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar Summary */}
                    <div className="lg:w-[380px] shrink-0">
                        <div className="bg-white p-6 sm:p-7 md:p-8 rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/60 lg:sticky lg:top-28">
                            <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                                    <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">{tCheckout('your_order')}</h3>
                                </div>
                                <Link href="/cart" className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5 uppercase tracking-widest transition-all px-3 py-1.5 bg-blue-50 rounded-full">
                                    <Edit2 size={12} /> {tCheckout('edit')}
                                </Link>
                            </div>

                            <div className="flex flex-col gap-5 mb-8 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                {items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center gap-4 group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-900 font-bold text-sm line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.title}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.quantity} <span className="text-[8px] mx-0.5 opacity-50">X</span> {(item.price).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-slate-900 text-sm tracking-tighter">{(item.price * item.quantity).toLocaleString()}</span>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mt-0.5">{tHeader('som')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Promo Code Section */}
                            <div className="mb-8 group">
                                <div className="flex items-center gap-2 mb-3 pl-1">
                                    <Tag size={14} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-slate-600 transition-colors">{tCheckout('promo_code')}</span>
                                </div>

                                {!appliedCoupon ? (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={tCheckout('promo_placeholder')}
                                            className={cn(
                                                "w-full bg-slate-50 border rounded-2xl pl-5 pr-24 py-3 sm:py-3.5 md:py-4 text-xs outline-none focus:ring-4 focus:ring-blue-500/5 transition-all uppercase font-black tracking-widest placeholder:text-slate-300",
                                                couponError ? "border-red-500 bg-red-50/30" : "border-slate-100 focus:border-blue-500 focus:bg-white"
                                            )}
                                            value={couponCode}
                                            onChange={(e) => {
                                                setCouponCode(e.target.value.toUpperCase());
                                                setCouponError(null);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={applyCoupon}
                                            disabled={isApplyingCoupon || !couponCode}
                                            className="absolute right-1.5 top-1.5 bottom-1.5 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-sm"
                                        >
                                            {isApplyingCoupon ? <Loader2 size={14} className="animate-spin" /> : tCheckout('apply')}
                                        </button>
                                        {couponError && <p className="absolute -bottom-5 left-1 text-[9px] font-black text-red-500 uppercase tracking-widest animate-fade-in">{couponError}</p>}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl animate-scale-in">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-emerald-500/60 tracking-widest">{tCheckout('active_promo')}</p>
                                                <p className="font-black text-emerald-700 text-sm tracking-widest">{appliedCoupon.code}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAppliedCoupon(null);
                                                setCouponCode('');
                                            }}
                                            className="w-8 h-8 rounded-xl hover:bg-red-50 text-emerald-400 hover:text-red-500 flex items-center justify-center transition-all"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 mb-8 pt-2">
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{tHeader('mahsulotlar')}</span>
                                    <span className="font-black text-slate-900 text-sm group-hover:scale-105 transition-transform">{total().toLocaleString()} <span className="text-[10px] ml-0.5 text-slate-400 font-bold">{tHeader('som')}</span></span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{tHeader('yetkazib_berish')}</span>
                                    <span className={cn("text-sm font-black transition-all group-hover:scale-105", (deliveryFee === 0 && (deliveryMethod === 'pickup' || formData.district)) ? "text-emerald-500" : "text-slate-900")}>
                                        {(deliveryMethod === 'courier' && !formData.district) ? (
                                            <>0 <span className="text-[10px] ml-0.5 text-slate-400 font-bold">{tHeader('som')}</span></>
                                        ) : (
                                            <>
                                                {deliveryFee === 0 ? tCart('free') : `${deliveryFee.toLocaleString()} `}
                                                {deliveryFee !== 0 && <span className="text-[10px] ml-0.5 text-slate-400 font-bold">{tHeader('som')}</span>}
                                            </>
                                        )}
                                    </span>
                                </div>

                                {appliedCoupon && (
                                    <div className="flex justify-between items-center text-emerald-500 animate-fade-in group">
                                        <span className="font-black text-[10px] uppercase tracking-widest">{tHeader('chegirma')}</span>
                                        <span className="font-bold text-sm group-hover:scale-105 transition-transform">-{appliedCoupon.discountAmount.toLocaleString()} <span className="text-[10px] ml-0.5 font-bold">{tHeader('som')}</span></span>
                                    </div>
                                )}

                                <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent my-6"></div>

                                <div className="flex justify-between items-end pb-2">
                                    <div>
                                        <span className="text-slate-900 font-black text-[10px] sm:text-[11px] md:text-[11px] uppercase tracking-[0.2em] block mb-1">{tHeader('jami_to_lov')}</span>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">{items.length} {tHeader('mahsulotlar')}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[22px] sm:text-[26px] md:text-3xl font-black text-slate-900 tracking-tighter leading-none block">{(total() + deliveryFee - (appliedCoupon?.discountAmount || 0)).toLocaleString()}</span>
                                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{tHeader('som')}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full relative group overflow-hidden bg-slate-900 text-white h-14 sm:h-15 md:h-16 rounded-[22px] font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-blue-600 active:scale-[0.97] shadow-2xl shadow-slate-900/20 disabled:opacity-50 disabled:pointer-events-none"
                                disabled={isProcessing}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative flex items-center justify-center gap-3">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>{tHeader('loading')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>{tHeader('buyurtma_berish')}</span>
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </button>

                            <p className="text-[10px] md:text-xs text-slate-400 text-center mt-4 leading-relaxed px-4">
                                {tCheckout('terms')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
