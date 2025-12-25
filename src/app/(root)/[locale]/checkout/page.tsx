"use client";

import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import styles from './page.module.css';
import { CreditCard, Truck, MapPin, Banknote, ShieldCheck, Loader2, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/navigation';
import { useTranslations } from 'next-intl';

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
            // 1. If "Save Address" is checked and we are in manual mode (no ID selected or ID changed), save it first
            // Or easier: Save it via a separate call or just let the user know.
            // The constraint: "Yangi manzil qo'shish imkoniyatini yarat va u bazada ushbu foydalanuvchiga biriktirilsin".
            // Useful to do it parallel or before order.

            if (saveNewAddress && !selectedAddressId) {
                try {
                    await fetch('/api/addresses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: 'My Address',
                            city: formData.city,
                            district: formData.district,
                            street: formData.address, // Simplifying for now, mapping entire string to street or splitting?
                            // To match schema well, we might want to be cleaner, but for now map "address" to street
                        })
                    });
                    // We don't block order if this fails, just log it.
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
                // Redirect to payment
                window.location.href = data.paymentUrl;
                clearCart();
                return;
            }

            // Success!
            clearCart();
            router.push(`/order-success?orderId=${data.order.id}`);
        } catch (err: any) {
            setError(err.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`container ${styles.container}`}>
            <div className={styles.main}>
                <h1 className={styles.pageTitle}>{tCart('checkout')}</h1>

                {error && (
                    <div className={styles.errorBanner}>
                        <ShieldAlert size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Step 1: Contact Info */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{tCheckout('contact_info')}</h2>
                    <div className={styles.grid2}>
                        <input
                            type="text"
                            placeholder={tCheckout('phone')}
                            className={styles.input}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder={tCheckout('fio')}
                            className={styles.input}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                </section>

                {/* Step 2: Delivery */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{tCheckout('delivery_method')}</h2>
                    <div className={styles.tabs}>
                        <button
                            type="button"
                            className={`${styles.tab} ${deliveryMethod === 'courier' ? styles.activeTab : ''}`}
                            onClick={() => setDeliveryMethod('courier')}
                        >
                            <Truck size={20} /> {tCheckout('courier')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.tab} ${deliveryMethod === 'pickup' ? styles.activeTab : ''}`}
                            onClick={() => setDeliveryMethod('pickup')}
                        >
                            <MapPin size={20} /> {tCheckout('pickup')}
                        </button>
                    </div>

                    {deliveryMethod === 'courier' && (
                        <div className={styles.deliveryForm}>

                            {/* Saved Addresses Section */}
                            {savedAddresses.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                                        {tHeader('mahsulotlar') === "Products" ? "Saved Addresses" : "Saqlangan manzillar"}
                                    </label>
                                    <div className={styles.grid2}>
                                        {savedAddresses.map(addr => (
                                            <div
                                                key={addr.id}
                                                className={`${styles.paymentCard} ${selectedAddressId === addr.id ? styles.activePayment : ''}`}
                                                onClick={() => selectAddress(addr)}
                                                style={{ alignItems: 'flex-start', padding: '16px' }}
                                            >
                                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{addr.title || 'Address'}</div>
                                                <div style={{ fontSize: '13px', color: '#666' }}>
                                                    {addr.city}, {addr.district} <br />
                                                    {addr.street} {addr.house}
                                                </div>
                                            </div>
                                        ))}
                                        <div
                                            className={`${styles.paymentCard} ${selectedAddressId === null ? styles.activePayment : ''}`}
                                            onClick={() => {
                                                setSelectedAddressId(null);
                                                setFormData(prev => ({ ...prev, address: '', district: '', city: 'Toshkent shahri' }));
                                            }}
                                            style={{ alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <span>+ New Address</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={styles.grid2}>
                                <select
                                    className={styles.select}
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                >
                                    <option>{tCheckout('city_tashkent')}</option>
                                    <option>Sirdaryo</option>
                                    <option>Jizzax</option>
                                    <option>Samarqand</option>
                                    <option>Buxoro</option>
                                </select>
                                <select
                                    className={styles.select}
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                >
                                    <option value="">Tumanni tanlang</option>
                                    <option>Yunusobod tumani</option>
                                    <option>Chilonzor tumani</option>
                                    <option>Mirzo Ulug'bek tumani</option>
                                    <option>Yashnobod tumani</option>
                                    <option>Mirobod tumani</option>
                                    <option>Shayxontohur tumani</option>
                                    <option>Olmazor tumani</option>
                                    <option>Uchtepa tumani</option>
                                    <option>Sergeli tumani</option>
                                    <option>Yangihayot tumani</option>
                                    <option>Bektemir tumani</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                placeholder={tCheckout('address_placeholder')}
                                className={styles.input}
                                style={{ marginTop: '16px' }}
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                required
                            />

                            {/* Save Address Checkbox */}
                            {!selectedAddressId && (
                                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="saveAddr"
                                        checked={saveNewAddress}
                                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="saveAddr" style={{ fontSize: '14px', cursor: 'pointer' }}>
                                        {tHeader('mahsulotlar') === "Products" ? "Save this address for later" : "Manzilni keyingi safar uchun saqlash"}
                                    </label>
                                </div>
                            )}

                            <textarea
                                placeholder={tCheckout('comment_placeholder')}
                                className={styles.textarea}
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            ></textarea>
                        </div>
                    )}
                </section>

                {/* Step 3: Payment */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>{tCheckout('payment_type')}</h2>
                    <div className={styles.paymentMethods}>
                        <div
                            className={`${styles.paymentCard} ${paymentMethod === 'click' ? styles.activePayment : ''}`}
                            onClick={() => setPaymentMethod('click')}
                        >
                            <CreditCard size={24} color="#0073ff" />
                            <span>Click</span>
                        </div>
                        <div
                            className={`${styles.paymentCard} ${paymentMethod === 'cash' ? styles.activePayment : ''}`}
                            onClick={() => setPaymentMethod('cash')}
                        >
                            <Banknote size={24} color="#ffa000" />
                            <span>{tCheckout('cash')}</span>
                        </div>
                    </div>
                </section>
            </div>

            <div className={styles.sidebar}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryHeader}>
                        <h3>{tCheckout('your_order')}</h3>
                        <Link href="/cart" className={styles.editLink}>{tCheckout('edit')}</Link>
                    </div>

                    <div className={styles.productList}>
                        {items.map(item => (
                            <div key={item.id} className={styles.productRow}>
                                <span className={styles.productName}>{item.quantity}x {item.title}</span>
                                <span className={styles.productPrice}>{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.summaryRow}>
                        <span>{tHeader('mahsulotlar')}:</span>
                        <span>{total().toLocaleString()} {tHeader('som')}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>{tHeader('yetkazib_berish')}:</span>
                        <span style={{ color: 'green' }}>{tCart('free')}</span>
                    </div>

                    <div className={styles.totalRow}>
                        <span>{tHeader('jami_to_lov')}:</span>
                        <span>{total().toLocaleString()} {tHeader('som')}</span>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
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
                    <p className={styles.terms}>
                        {tCheckout('terms')}
                    </p>
                </div>
            </div>
        </form>
    );
}
