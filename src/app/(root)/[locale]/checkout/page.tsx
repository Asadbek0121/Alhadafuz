
"use client";

import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import { CreditCard, Truck, MapPin, Banknote, ShieldAlert, Loader2, Edit2, CheckCircle2, Tag, XCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';
import { PhoneInput } from '@/components/ui/phone-input';
import { regions, districts } from '@/constants/locations';
import { useMessages } from 'next-intl';
import { toast } from 'sonner';

export default function CheckoutPage() {
    const { items, total, clearCart } = useCartStore();
    const { user, isAuthenticated, openAuthModal } = useUserStore();
    const tCheckout = useTranslations('Checkout');
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const tProfile = useTranslations('Profile');
    const messages = useMessages() as any;
    const router = useRouter();

    const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
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
                    }
                }
            } catch (err) {
                console.error("Failed to fetch payment methods", err);
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
            const isTotalFree = selectedZone.freeFrom && currentTotal >= selectedZone.freeFrom;

            const totalQty = items.reduce((acc, item) => acc + item.quantity, 0);
            const isQtyFree = selectedZone.freeFromQty && totalQty >= selectedZone.freeFromQty;

            // Check if any item matches the required discount type
            const isDiscountFree = selectedZone.freeIfHasDiscount && items.some(item => {
                const cartItem = item as any;
                if (!cartItem.hasDiscount) return false;

                // If zone accepts ANY discount, any discounted item is enough
                if (!selectedZone.freeDiscountType || selectedZone.freeDiscountType === 'ANY') return true;

                // Otherwise check for exact match
                return cartItem.discountType === selectedZone.freeDiscountType;
            });

            if (isTotalFree || isDiscountFree || isQtyFree) {
                setDeliveryFee(0);
            } else {
                setDeliveryFee(selectedZone.price);
            }
        } else {
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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Order creation failed');
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
        <form onSubmit={handleSubmit} className="container py-6 md:py-12 max-w-7xl mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 md:mb-8 tracking-tight">{tCart('checkout')}</h1>

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
                    <section className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-900">{tCheckout('contact_info')}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{tCheckout('phone_label')}</label>
                                <PhoneInput
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base"
                                    value={formData.phone}
                                    onChange={(val) => setFormData({ ...formData, phone: val })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{tCheckout('fio_label')}</label>
                                <input
                                    type="text"
                                    placeholder={tCheckout('fio')}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* Step 2: Delivery */}
                    <section className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">2</div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-900">{tCheckout('delivery_method')}</h2>
                        </div>

                        <div className="flex gap-3 mb-6 p-1 bg-slate-50 rounded-xl">
                            <button
                                type="button"
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${deliveryMethod === 'courier' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setDeliveryMethod('courier')}
                            >
                                <Truck size={18} /> {tCheckout('courier')}
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${deliveryMethod === 'pickup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setDeliveryMethod('pickup')}
                            >
                                <MapPin size={18} /> {tCheckout('pickup')}
                            </button>
                        </div>

                        {deliveryMethod === 'courier' && (
                            <div className="flex flex-col gap-4 animate-fade-in">

                                {/* Saved Addresses */}
                                {savedAddresses.length > 0 && (
                                    <div className="mb-2">
                                        <label className="block text-sm font-bold text-slate-900 mb-3">
                                            {tCheckout('saved_addresses')}
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {savedAddresses.map(addr => (
                                                <div
                                                    key={addr.id}
                                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                                                    onClick={() => selectAddress(addr)}
                                                >
                                                    {selectedAddressId === addr.id && <div className="absolute top-3 right-3 text-blue-600"><CheckCircle2 size={18} /></div>}
                                                    <div className="font-bold text-sm text-slate-900 mb-1">
                                                        {(addr.title === "My Address" || addr.title === "Mening manzilim" || addr.title === "Мой адрес")
                                                            ? tProfile('my_address')
                                                            : (addr.title || tCheckout('address'))}
                                                    </div>
                                                    <div className="text-xs text-slate-500 leading-relaxed">
                                                        {safeTranslate(addr.city)}, {safeTranslate(addr.district)} <br />
                                                        {addr.street} {addr.house}
                                                    </div>
                                                </div>
                                            ))}
                                            <div
                                                className={`cursor-pointer p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all ${selectedAddressId === null ? 'bg-slate-50' : ''}`}
                                                onClick={() => {
                                                    setSelectedAddressId(null);
                                                    setFormData(prev => ({ ...prev, address: '', district: '', city: 'toshkent_sh' }));

                                                    // Smooth scroll and focus
                                                    setTimeout(() => {
                                                        addressFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        citySelectRef.current?.focus();
                                                    }, 100);
                                                }}
                                            >
                                                <span className="font-bold text-sm">+ {tCheckout('new_address')}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={addressFormRef}>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{tCheckout('city_label')}</label>
                                        <select
                                            ref={citySelectRef}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base appearance-none cursor-pointer"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value, district: '' })}
                                        >
                                            {regions.map((region) => (
                                                <option key={region.id} value={region.id}>{safeTranslate(region.id)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{tCheckout('district_label')}</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base appearance-none cursor-pointer"
                                            value={formData.district}
                                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                            disabled={!formData.city}
                                        >
                                            <option value="">{tCheckout('district_select')}</option>
                                            {(districts[formData.city] || []).map((dist) => (
                                                <option key={dist} value={dist}>{safeTranslate(dist)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{tCheckout('address_label')}</label>
                                    <input
                                        type="text"
                                        placeholder={tCheckout('address_placeholder')}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Save Address Checkbox */}
                                {!selectedAddressId && (
                                    <div className="flex items-center gap-3 pl-1">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                id="saveAddr"
                                                checked={saveNewAddress}
                                                onChange={(e) => setSaveNewAddress(e.target.checked)}
                                                className="w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all"
                                            />
                                        </div>
                                        <label htmlFor="saveAddr" className="text-sm cursor-pointer select-none text-slate-700">
                                            {tCheckout('save_this_for_later')}
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{tCheckout('comment_label')}</label>
                                    <textarea
                                        placeholder={tCheckout('comment_placeholder')}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base min-h-[100px]"
                                        value={formData.comment}
                                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {deliveryMethod === 'pickup' && (
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-600 text-sm animate-fade-in">
                                {tCheckout('pickup_info')}
                            </div>
                        )}
                    </section>

                    {/* Step 3: Payment */}
                    <section className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">3</div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-900">{tCheckout('payment_type')}</h2>
                        </div>

                        {isMethodsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="animate-spin text-slate-400" />
                            </div>
                        ) : paymentMethods.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl">
                                To'lov tizimlari mavjud emas
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {paymentMethods.map((method) => {
                                    const isSelected = paymentMethod === method.provider;
                                    let Icon = CreditCard;
                                    let colorClass = "text-slate-600";
                                    let bgClass = "bg-slate-50";
                                    let borderClass = "border-slate-100";

                                    // Style based on provider
                                    switch (method.provider) {
                                        case 'CLICK':
                                            Icon = CreditCard;
                                            colorClass = "text-[#0085db]";
                                            if (isSelected) { bgClass = "bg-[#0085db]/10"; borderClass = "border-[#0085db]"; }
                                            break;
                                        case 'PAYME':
                                            Icon = CreditCard;
                                            colorClass = "text-[#00c1af]";
                                            if (isSelected) { bgClass = "bg-[#00c1af]/10"; borderClass = "border-[#00c1af]"; }
                                            break;
                                        case 'UZUM':
                                            Icon = Banknote; // Or Wallet
                                            colorClass = "text-[#7000ff]";
                                            if (isSelected) { bgClass = "bg-[#7000ff]/10"; borderClass = "border-[#7000ff]"; }
                                            break;
                                        case 'CASH':
                                            Icon = Banknote;
                                            colorClass = "text-amber-500";
                                            if (isSelected) { bgClass = "bg-amber-50/50"; borderClass = "border-amber-500"; }
                                            break;
                                        case 'CARD':
                                            Icon = CreditCard;
                                            colorClass = "text-blue-500";
                                            if (isSelected) { bgClass = "bg-blue-50"; borderClass = "border-blue-500"; }
                                            break;
                                    }

                                    return (
                                        <div
                                            key={method.id}
                                            className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 aspect-[4/3] transition-all hover:bg-slate-50 ${isSelected ? borderClass + ' ' + bgClass : 'border-slate-100'}`}
                                            onClick={() => setPaymentMethod(method.provider)}
                                        >
                                            <Icon size={28} className={colorClass} />
                                            <span className="font-bold text-sm text-slate-900 text-center leading-tight">{method.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar Summary */}
                <div className="lg:w-[400px] shrink-0">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl lg:sticky lg:top-24">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
                            <h3 className="font-bold text-xl text-slate-900">{tCheckout('your_order')}</h3>
                            <Link href="/cart" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                <Edit2 size={16} /> {tCheckout('edit')}
                            </Link>
                        </div>

                        <div className="flex flex-col gap-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {items.map(item => (
                                <div key={item.id} className="flex justify-between items-start gap-4 text-sm">
                                    <span className="text-slate-600 flex-1 font-medium">{item.quantity}x {item.title}</span>
                                    <span className="font-bold text-slate-900 shrink-0">{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>


                        {/* Promo Code Section */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Tag size={16} className="text-blue-600" />
                                <span className="text-sm font-bold text-slate-900">{tCheckout('promo_code')}</span>
                            </div>

                            {!appliedCoupon ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={tCheckout('promo_placeholder')}
                                            className={`flex-1 bg-white border ${couponError ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-bold`}
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
                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                                        >
                                            {isApplyingCoupon ? <Loader2 size={16} className="animate-spin" /> : tCheckout('apply')}
                                        </button>
                                    </div>
                                    {couponError && <p className="text-[10px] font-bold text-red-500 animate-fade-in">{couponError}</p>}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-xl animate-scale-in">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">{tCheckout('active_promo')}</p>
                                        <p className="font-black text-emerald-700">{appliedCoupon.code}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAppliedCoupon(null);
                                            setCouponCode('');
                                        }}
                                        className="text-emerald-700 hover:text-red-500 p-1 transition-colors"
                                    >
                                        <XCircle size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 mb-8">
                            <div className="flex justify-between text-slate-500 text-sm">
                                <span>{tHeader('mahsulotlar')}:</span>
                                <span className="font-medium text-slate-900">{total().toLocaleString()} {tHeader('som')}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-sm">
                                <span>{tHeader('yetkazib_berish')}:</span>
                                <span className={deliveryFee === 0 ? "font-bold text-emerald-600" : "font-bold text-slate-900"}>
                                    {deliveryFee === 0 ? tCart('free') : `${deliveryFee.toLocaleString()} ${tHeader('som')}`}
                                </span>
                            </div>

                            {appliedCoupon && (
                                <div className="flex justify-between text-emerald-600 text-sm animate-fade-in">
                                    <span>{tHeader('chegirma')} ({appliedCoupon.code}):</span>
                                    <span className="font-bold">-{appliedCoupon.discountAmount.toLocaleString()} {tHeader('som')}</span>
                                </div>
                            )}

                            <div className="border-t border-dashed border-slate-200 my-2"></div>
                            <div className="flex justify-between text-lg font-black text-slate-900">
                                <span>{tHeader('jami_to_lov')}:</span>
                                <span>{(total() + deliveryFee - (appliedCoupon?.discountAmount || 0)).toLocaleString()} {tHeader('som')}</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-slate-900/20"
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>{tHeader('loading')}</span>
                                </>
                            ) : (
                                tHeader('buyurtma_berish')
                            )}
                        </button>

                        <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed px-4">
                            {tCheckout('terms')}
                        </p>
                    </div>
                </div>
            </div>
        </form>
    );
}
