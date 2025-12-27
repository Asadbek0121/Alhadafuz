"use client";

import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import { CreditCard, Truck, MapPin, Banknote, ShieldAlert, Loader2, Edit2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';

const regionsData: Record<string, string[]> = {
    "Toshkent shahri": ["Bektemir tumani", "Chilonzor tumani", "Mirobod tumani", "Mirzo Ulug'bek tumani", "Olmazor tumani", "Sergeli tumani", "Shayxontohur tumani", "Uchtepa tumani", "Yakkasaroy tumani", "Yangihayot tumani", "Yashnobod tumani", "Yunusobod tumani"],
    "Andijon viloyati": ["Andijon shahri", "Asaka tumani", "Baliqchi tumani", "Bo'z tumani", "Buloqboshi tumani", "Jalaquduq tumani", "Izboskan tumani", "Qo'rg'ontepa tumani", "Marhamat tumani", "Oltinko'l tumani", "Paxtaobod tumani", "Shahrixon tumani", "Ulug'nor tumani", "Xo'jaobod tumani", "Xonobod shahri"],
    "Buxoro viloyati": ["Buxoro shahri", "Buxoro tumani", "G'ijduvon tumani", "Jondor tumani", "Kogon shahri", "Kogon tumani", "Olot tumani", "Peshku tumani", "Qorako'l tumani", "Qorovulbozor tumani", "Romitan tumani", "Shofirkon tumani", "Vobkent tumani"],
    "Farg'ona viloyati": ["Farg'ona shahri", "Bag'dod tumani", "Beshariq tumani", "Buvayda tumani", "Dang'ara tumani", "Farg'ona tumani", "Furqat tumani", "Qo'qon shahri", "Qo'shtepa tumani", "Marg'ilon shahri", "O'zbekiston tumani", "Oltiariq tumani", "Quva tumani", "Quvasoy shahri", "Rishton tumani", "So'x tumani", "Toshloq tumani", "Uchko'prik tumani", "Yozyovon tumani"],
    "Jizzax viloyati": ["Jizzax shahri", "Arnasoy tumani", "Baxmal tumani", "Do'stlik tumani", "Forish tumani", "G'allaorol tumani", "Mirzacho'l tumani", "Paxtakor tumani", "Sharof Rashidov tumani", "Yangiobod tumani", "Zomin tumani", "Zafarobod tumani", "Zarbdor tumani"],
    "Xorazm viloyati": ["Urganch shahri", "Bog'ot tumani", "Gurlan tumani", "Xiva shahri", "Xiva tumani", "Xonqa tumani", "Hazorasp tumani", "Qo'shko'pir tumani", "Shovot tumani", "Urganch tumani", "Yangiariq tumani", "Yangibozor tumani"],
    "Namangan viloyati": ["Namangan shahri", "Chortoq tumani", "Chust tumani", "Kosonsoy tumani", "Mingbuloq tumani", "Namangan tumani", "Norin tumani", "Pop tumani", "To'raqo'rg'on tumani", "Uchqo'rg'on tumani", "Uychi tumani", "Yangiqo'rg'on tumani"],
    "Navoiy viloyati": ["Navoiy shahri", "Zarafshon shahri", "Karmana tumani", "Konimex tumani", "Navbahor tumani", "Nurota tumani", "Qiziltepa tumani", "Tomdi tumani", "Uchquduq tumani", "Xatirchi tumani"],
    "Qashqadaryo viloyati": ["Qarshi shahri", "Shahrisabz shahri", "Chiroqchi tumani", "Dehqonobod tumani", "G'uzor tumani", "Kasbi tumani", "Kitob tumani", "Koson tumani", "Mirishkor tumani", "Muborak tumani", "Nishon tumani", "Qamashi tumani", "Qarshi tumani", "Shahrisabz tumani", "Yakkabog' tumani"],
    "Qoraqalpog'iston Respublikasi": ["Nukus shahri", "Amudaryo tumani", "Beruniy tumani", "Chimboy tumani", "Ellikqal'a tumani", "Kegeyli tumani", "Mo'ynoq tumani", "Nukus tumani", "Qanliko'l tumani", "Qo'ng'irot tumani", "Qorao'zak tumani", "Shumanay tumani", "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani", "Taxiatosh tumani", "Bo'zatov tumani"],
    "Samarqand viloyati": ["Samarqand shahri", "Bulung'ur tumani", "Ishtixon tumani", "Jomboy tumani", "Kattaqo'rg'on shahri", "Kattaqo'rg'on tumani", "Narpay tumani", "Nurobod tumani", "Oqdaryo tumani", "Paxtachi tumani", "Payariq tumani", "Pastdarg'om tumani", "Qo'shrabot tumani", "Samarqand tumani", "Tayloq tumani", "Urgut tumani"],
    "Sirdaryo viloyati": ["Guliston shahri", "Yangiyer shahri", "Shirin shahri", "Boyovut tumani", "Guliston tumani", "Mirzaobod tumani", "Oqoltin tumani", "Sardoba tumani", "Sayxunobod tumani", "Sirdaryo tumani", "Xovos tumani"],
    "Surxondaryo viloyati": ["Termiz shahri", "Angor tumani", "Bandixon tumani", "Boysun tumani", "Denov tumani", "Jarqo'rg'on tumani", "Muzrabot tumani", "Oltinsoy tumani", "Qiziriq tumani", "Qumqo'rg'on tumani", "Sariosiyo tumani", "Sherobod tumani", "Sho'rchi tumani", "Termiz tumani", "Uzun tumani"],
    "Toshkent viloyati": ["Nurafshon shahri", "Angren shahri", "Bekobod shahri", "Chirchiq shahri", "Olmaliq shahri", "Ohangaron shahri", "Yangiyo'l shahri", "Bekobod tumani", "Bo'ka tumani", "Bo'stonliq tumani", "Chinoz tumani", "Qibray tumani", "O'rta Chirchiq tumani", "Oqqo'rg'on tumani", "Parkent tumani", "Piskent tumani", "Quyi Chirchiq tumani", "Yangiyo'l tumani", "Yuqori Chirchiq tumani", "Zangiota tumani"]
};

export default function CheckoutPage() {
    const { items, total, clearCart } = useCartStore();
    const { user, isAuthenticated, openAuthModal } = useUserStore();
    const tCheckout = useTranslations('Checkout');
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const router = useRouter();

    const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
    const [paymentMethod, setPaymentMethod] = useState<'click' | 'payme' | 'cash' | 'installment'>('click');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        phone: user?.phone || '',
        name: user?.name || '',
        city: 'Toshkent shahri',
        district: 'Yunusobod tumani',
        address: '',
        comment: '',
    });

    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [saveNewAddress, setSaveNewAddress] = useState(false);

    useEffect(() => {
        if (items.length === 0) {
            router.replace('/');
        }

        // Fetch addresses
        if (isAuthenticated) {
            fetch('/api/addresses')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSavedAddresses(data);
                        // Optional: pre-select default
                        const def = data.find((a: any) => a.isDefault);
                        if (def) selectAddress(def);
                    }
                })
                .catch(err => console.error(err));
        }
    }, [items, router, isAuthenticated]);

    const selectAddress = (addr: any) => {
        setSelectedAddressId(addr.id);
        setFormData(prev => ({
            ...prev,
            city: addr.city,
            district: addr.district || '',
            address: addr.street + (addr.house ? `, ${addr.house}` : '') + (addr.apartment ? `, ${addr.apartment}` : ''),
        }));
    };

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
                            title: 'My Address',
                            city: formData.city,
                            district: formData.district,
                            street: formData.address,
                        })
                    });
                } catch (e) {
                    console.error("Failed to save address", e);
                }
            }

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
                    total: total(),
                    paymentMethod,
                    deliveryMethod,
                    deliveryAddress: {
                        city: formData.city,
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
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Telefon raqam</label>
                                <input
                                    type="text"
                                    placeholder={tCheckout('phone')}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Ism-familiya</label>
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
                                            {tHeader('mahsulotlar') === "Products" ? "Saved Addresses" : "Saqlangan manzillar"}
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {savedAddresses.map(addr => (
                                                <div
                                                    key={addr.id}
                                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                                                    onClick={() => selectAddress(addr)}
                                                >
                                                    {selectedAddressId === addr.id && <div className="absolute top-3 right-3 text-blue-600"><CheckCircle2 size={18} /></div>}
                                                    <div className="font-bold text-sm text-slate-900 mb-1">{addr.title || 'Address'}</div>
                                                    <div className="text-xs text-slate-500 leading-relaxed">
                                                        {addr.city}, {addr.district} <br />
                                                        {addr.street} {addr.house}
                                                    </div>
                                                </div>
                                            ))}
                                            <div
                                                className={`cursor-pointer p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all ${selectedAddressId === null ? 'bg-slate-50' : ''}`}
                                                onClick={() => {
                                                    setSelectedAddressId(null);
                                                    setFormData(prev => ({ ...prev, address: '', district: '', city: 'Toshkent shahri' }));
                                                }}
                                            >
                                                <span className="font-bold text-sm">+ {tHeader('mahsulotlar') === "Products" ? "New Address" : "Yangi manzil"}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Viloyat / Shahar</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base appearance-none cursor-pointer"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value, district: '' })}
                                        >
                                            {Object.keys(regionsData).map((region) => (
                                                <option key={region} value={region}>{region}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Tuman</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 text-sm md:text-base appearance-none cursor-pointer"
                                            value={formData.district}
                                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                            disabled={!formData.city}
                                        >
                                            <option value="">Tumanni tanlang</option>
                                            {(regionsData[formData.city] || []).map((dist) => (
                                                <option key={dist} value={dist}>{dist}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Aniq manzil (ko'cha, uy, xonadon)</label>
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
                                            {tHeader('mahsulotlar') === "Products" ? "Save this address for later" : "Manzilni keyingi safar uchun saqlash"}
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Izoh (ixtiyoriy)</label>
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
                                Hozircha faqat Toshkent sh, Yunusobod tumani filialidan olib ketish mumkin.
                            </div>
                        )}
                    </section>

                    {/* Step 3: Payment */}
                    <section className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">3</div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-900">{tCheckout('payment_type')}</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div
                                className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 aspect-[4/3] transition-all hover:bg-slate-50 ${paymentMethod === 'click' ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100'}`}
                                onClick={() => setPaymentMethod('click')}
                            >
                                <CreditCard size={28} className="text-blue-600" />
                                <span className="font-bold text-sm text-slate-900">Click</span>
                            </div>
                            <div
                                className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 aspect-[4/3] transition-all hover:bg-slate-50 ${paymentMethod === 'cash' ? 'border-amber-500 bg-amber-50/30' : 'border-slate-100'}`}
                                onClick={() => setPaymentMethod('cash')}
                            >
                                <Banknote size={28} className="text-amber-500" />
                                <span className="font-bold text-sm text-slate-900">{tCheckout('cash')}</span>
                            </div>
                        </div>
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

                        <div className="space-y-3 mb-8">
                            <div className="flex justify-between text-slate-500 text-sm">
                                <span>{tHeader('mahsulotlar')}:</span>
                                <span className="font-medium text-slate-900">{total().toLocaleString()} {tHeader('som')}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-sm">
                                <span>{tHeader('yetkazib_berish')}:</span>
                                <span className="font-bold text-emerald-600">{tCart('free')}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-200 my-2"></div>
                            <div className="flex justify-between text-lg font-black text-slate-900">
                                <span>{tHeader('jami_to_lov')}:</span>
                                <span>{total().toLocaleString()} {tHeader('som')}</span>
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
                                    <span>Yuklanmoqda...</span>
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
