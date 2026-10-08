"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useEffect, useState } from "react";
import { Package, ChevronDown, ChevronUp, Search, Filter, ShoppingCart, ExternalLink, MapPin, CreditCard, Banknote, Loader2, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";

interface Product {
    id: string;
    title: string;
    image: string;
}

interface OrderItem {
    id: string;
    title: string;
    price: number;
    quantity: number;
    image: string;
    product?: Product | null;
    productId: string;
    fulfillmentType?: string;
    variantSnapshot?: string;
    variantLabel?: string;
    sku?: string;
}

interface Order {
    id: string;
    orderNumber?: string | null;
    createdAt: string;
    total: number;
    status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "AWAITING_PAYMENT" | "DELIVERING" | "PICKED_UP" | "ASSIGNED" | "COMPLETED";
    items: OrderItem[];
    paymentUrl?: string | null;
    paymentMethod: string;
    deliveryFee?: number;
}

interface PaymentMethod {
    id: string;
    name: string;
    provider: string;
    isActive: boolean;
}

import { useTranslations, useLocale } from "next-intl";
import { useSession } from "next-auth/react";

export default function OrderHistoryPage() {
    const t = useTranslations('Profile');
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const tCheckout = useTranslations('Checkout');
    const locale = useLocale();
    const [isLoading, setIsLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const { status } = useSession();
    const { addToCart } = useCartStore();
    const tChina = useTranslations('ChinaOrder');

    // Payment modal state
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payModalOrder, setPayModalOrder] = useState<Order | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<string>('');
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [isMethodsLoading, setIsMethodsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            if (status !== "authenticated") {
                setIsLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/orders`, { cache: 'no-store' });
                const data = await res.json();

                if (data.orders) {
                    setOrders(data.orders);
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [status]);

    useEffect(() => {
        if (!payModalOpen) return;

        const fetchMethods = async () => {
            setIsMethodsLoading(true);
            try {
                const res = await fetch('/api/payment-methods');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setPaymentMethods(data);
                        setSelectedMethod(data[0].provider);
                    } else {
                        setPaymentMethods([
                            { id: 'cash', name: tCheckout('cash') || 'Naqd pul', provider: 'CASH', isActive: true },
                        ]);
                        setSelectedMethod('CASH');
                    }
                } else {
                    setPaymentMethods([
                        { id: 'cash', name: tCheckout('cash') || 'Naqd pul', provider: 'CASH', isActive: true },
                    ]);
                    setSelectedMethod('CASH');
                }
            } catch (err) {
                console.error("Failed to fetch payment methods", err);
                setPaymentMethods([
                    { id: 'cash', name: tCheckout('cash') || 'Naqd pul', provider: 'CASH', isActive: true },
                ]);
                setSelectedMethod('CASH');
            } finally {
                setIsMethodsLoading(false);
            }
        };

        fetchMethods();
    }, [payModalOpen, tCheckout]);

    const handleReorder = (item: OrderItem) => {
        addToCart({
            id: item.productId,
            title: item.title,
            price: item.price,
            image: item.image
        });
        toast.success(tCart('added_to_cart') || "Added to cart");
    };

    const getStatusColor = (status: Order["status"]) => {
        switch (status) {
            case "DELIVERED": return "bg-green-100 text-green-700 border-green-200";
            case "DELIVERING": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "PICKED_UP": return "bg-teal-100 text-teal-700 border-teal-200";
            case "ASSIGNED": return "bg-indigo-100 text-indigo-700 border-indigo-200";
            case "COMPLETED": return "bg-green-100 text-green-700 border-green-200";
            case "PROCESSING": return "bg-blue-100 text-blue-700 border-blue-200";
            case "SHIPPED": return "bg-purple-100 text-purple-700 border-purple-200";
            case "CANCELLED": return "bg-red-100 text-red-700 border-red-200";
            case "AWAITING_PAYMENT": return "bg-amber-100 text-amber-700 border-amber-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const openPaymentModal = (order: Order) => {
        setPayModalOrder(order);
        setPayModalOpen(true);
        setSelectedMethod('');
    };

    const handleConfirmPayment = async () => {
        if (!payModalOrder) return;

        setIsGenerating(true);
        try {
            const res = await fetch(`/api/orders/${payModalOrder.id}/generate-payment-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethod: selectedMethod }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'To\'lov URL olishda xatolik');
            }

            const data = await res.json();
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                throw new Error('To\'lov URL mavjud emas');
            }
        } catch (error) {
            console.error('Payment URL generation failed:', error);
            toast.error(error instanceof Error ? error.message : 'Xatolik yuz berdi');
        } finally {
            setIsGenerating(false);
        }
    };

    const closePaymentModal = () => {
        setPayModalOpen(false);
        setPayModalOrder(null);
        setIsGenerating(false);
    };

    const getPaymentMethodDesc = (provider: string): string => {
        const p = provider.toUpperCase();
        if (p === 'CLICK') return tCheckout('pay_click') || 'Click orqali onlayn to\'lov';
        if (p === 'PAYME') return tCheckout('pay_payme') || 'Payme orqali onlayn to\'lov';
        if (p === 'CASH') return tCheckout('pay_cash') || 'Yetkazib berishda naqd pul';
        return provider;
    };

    return (
        <div className="space-y-3 md:space-y-6">
            <div className="flex items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="min-w-0">
                    <h1 className="text-base md:text-2xl font-black text-gray-900 leading-tight">{t('order_history')}</h1>
                    <p className="text-[11px] md:text-sm text-text-muted mt-0.5">{t('my_orders')}</p>
                </div>
            </div>

            <div className="space-y-2.5 md:space-y-4">
                {isLoading ? (
                    <div className="space-y-2.5">
                        {[1, 2].map((n) => (
                            <div key={n} className="bg-white h-20 md:h-32 rounded-2xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : orders.length > 0 ? (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                            <div
                                className="p-3.5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100/50">
                                        <Package size={18} className="md:w-6 md:h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                            <span className="font-bold text-[13px] md:text-base text-gray-900">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                                            <span className={`text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tight ${getStatusColor(order.status)}`}>
                                                {t(order.status.toLowerCase())}
                                            </span>
                                        </div>
                                        <p className="text-[10px] md:text-sm text-text-muted font-medium">{formatDate(order.createdAt)} • {order.items.length} {t('items')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-3 md:mt-0 pl-[52px] md:pl-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-[9px] md:text-xs text-text-muted uppercase font-bold tracking-tight opacity-70">{t('total')}</p>
                                        <p className="text-[14px] md:text-lg font-black text-blue-600">{order.total.toLocaleString()} {tHeader('som')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {order.status === 'AWAITING_PAYMENT' && (
                                            <Button
                                                size="sm"
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-black h-7 md:h-9 px-2.5 md:px-4 rounded-lg text-[10px] md:text-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPaymentModal(order);
                                                }}
                                            >
                                                {t('pay_now').toUpperCase()}
                                            </Button>
                                        )}
                                        {['PICKED_UP', 'DELIVERING', 'ASSIGNED', 'PROCESSING'].includes(order.status) && (
                                            <Link
                                                href={`/delivery?order=${order.id}`}
                                                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black h-7 md:h-9 px-2.5 md:px-3.5 rounded-lg text-[10px] md:text-xs transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MapPin size={12} />
                                                <span className="hidden xs:inline">{t('track_order')}</span>
                                            </Link>
                                        )}
                                        <div className="text-slate-400 p-1 bg-slate-50 rounded-lg group-hover:bg-white transition-colors">
                                            {expandedOrder === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div className="border-t border-gray-100 bg-gray-50/30 p-3.5 md:p-6 space-y-3">
                                    <h3 className="font-bold text-[10px] md:text-xs text-text-muted uppercase tracking-wider mb-0.5">{t('order_content')}</h3>
                                    <div className="grid gap-2 md:gap-4">
                                        {order.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between bg-white p-2 md:p-3 rounded-xl border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-2.5 md:gap-4 flex-1 min-w-0">
                                                    <div className="relative w-9 h-9 md:w-12 md:h-12 rounded-lg overflow-hidden bg-white border border-slate-100 shrink-0">
                                                        <Image src={item.image} alt={item.title} fill className="object-contain p-1" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-[11px] md:text-sm text-gray-900 line-clamp-1">{item.title}</p>
                                                        {item.fulfillmentType === 'CHINA_ORDER' && (
                                                            <span className="inline-block mt-0.5 text-[8px] md:text-[10px] font-black text-red-500 bg-red-50 border border-red-100 rounded-full px-1.5 py-0.5">
                                                                🇨🇳 Xitoydan
                                                            </span>
                                                        )}
                                                        {(item.variantSnapshot || item.variantLabel) && (
                                                            <p className="text-[9px] md:text-xs text-slate-500 font-medium mt-0.5">{item.variantSnapshot || item.variantLabel}</p>
                                                        )}
                                                        {item.sku && (
                                                            <p className="text-[9px] md:text-xs text-slate-400 font-medium">SKU: {item.sku}</p>
                                                        )}
                                                        <p className="text-[9px] md:text-xs text-text-muted font-medium mt-0.5">{item.quantity} x {item.price.toLocaleString()} {tHeader('som')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                                    {item.product ? (
                                                        <Link href={`/product/${item.product.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg">
                                                            <ExternalLink size={12} />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-[9px] text-red-400 font-bold px-1">{t('unavailable')}</span>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleReorder(item)}
                                                        className="h-7 md:h-8 text-[10px] md:text-xs font-bold gap-1 px-2 border-slate-200"
                                                    >
                                                        <ShoppingCart size={11} />
                                                        <span className="hidden xs:inline">{t('buy_again')}</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order Summary in Expanded View */}
                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                                        <div className="flex justify-between text-[11px] md:text-sm">
                                            <span className="text-text-muted font-medium">{tHeader('mahsulotlar')}:</span>
                                            <span className="font-bold text-gray-900">{(order.total - (order.deliveryFee || 0)).toLocaleString()} {tHeader('som')}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] md:text-sm">
                                            <span className="text-text-muted font-medium">{tHeader('yetkazib_berish')}:</span>
                                            <span className={(order.deliveryFee || 0) === 0 ? "text-emerald-600 font-bold" : "font-bold text-gray-900"}>
                                                {(order.deliveryFee || 0) === 0 ? tCart('free') : `${order.deliveryFee?.toLocaleString()} ${tHeader('som')}`}
                                            </span>
                                        </div>
                                        {order.items.some(i => i.fulfillmentType === 'CHINA_ORDER') && (
                                            <div className="flex justify-between text-[11px] md:text-sm">
                                                <span className="text-red-500 font-medium">{tChina('cargo_later')}:</span>
                                                <span className="text-red-500 font-bold">{tChina('cargo_status_pending')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-[13px] md:text-base font-black pt-2 border-t border-gray-100 mt-2">
                                            <span className="text-gray-900">{t('total')}:</span>
                                            <span className="text-blue-600">{order.total.toLocaleString()} {tHeader('som')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 md:py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
                            <Package className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm md:text-lg font-bold">{t('no_orders')}</p>
                    </div>
                )}
            </div>

            {/* Payment Method Selection Modal */}
            {payModalOpen && payModalOrder && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="payment-modal-title"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closePaymentModal}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
                            <div>
                                <h2 id="payment-modal-title" className="text-base font-black text-gray-900">{t('pay_now')}</h2>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    #{payModalOrder.orderNumber || payModalOrder.id.slice(-6)} • {payModalOrder.total.toLocaleString()} {tHeader('som')}
                                </p>
                            </div>
                            <button
                                onClick={closePaymentModal}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                                aria-label="Yopish"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-gray-500 font-medium">
                                To'lov turini tanlang:
                            </p>

                            {isMethodsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {paymentMethods.map((method) => {
                                        const isSelected = selectedMethod === method.provider;
                                        const providerUpper = method.provider.toUpperCase();

                                        let Icon = CreditCard;
                                        let iconColor = "text-blue-600";
                                        let iconBg = "bg-blue-50";
                                        let borderColor = isSelected ? "border-blue-600 bg-blue-50/50" : "border-gray-100 bg-white hover:border-gray-200";

                                        switch (providerUpper) {
                                            case 'CLICK':
                                                Icon = CreditCard;
                                                iconColor = "text-[#0085db]";
                                                iconBg = "bg-[#0085db]/10";
                                                borderColor = isSelected
                                                    ? "border-[#0085db] bg-[#0085db]/5"
                                                    : "border-gray-100 bg-white hover:border-gray-200";
                                                break;
                                            case 'PAYME':
                                                Icon = CreditCard;
                                                iconColor = "text-[#00c1af]";
                                                iconBg = "bg-[#00c1af]/10";
                                                borderColor = isSelected
                                                    ? "border-[#00c1af] bg-[#00c1af]/5"
                                                    : "border-gray-100 bg-white hover:border-gray-200";
                                                break;
                                            case 'CASH':
                                                Icon = Banknote;
                                                iconColor = "text-amber-500";
                                                iconBg = "bg-amber-50";
                                                borderColor = isSelected
                                                    ? "border-amber-500 bg-amber-50"
                                                    : "border-gray-100 bg-white hover:border-gray-200";
                                                break;
                                        }

                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setSelectedMethod(method.provider)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${borderColor}`}
                                            >
                                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                                    <Icon size={20} className={iconColor} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-gray-900">{method.name}</p>
                                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                                        {getPaymentMethodDesc(method.provider)}
                                                    </p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected
                                                        ? 'border-blue-600 bg-blue-600'
                                                        : 'border-gray-200'
                                                }`}>
                                                    {isSelected && (
                                                        <div className="w-2 h-2 rounded-full bg-white" />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Info */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-1.5">
                                <p className="text-[11px] font-black text-blue-700 uppercase tracking-wider">
                                    {tCheckout('secure_payment') || 'Xavfsiz to\'lov'}
                                </p>
                                <p className="text-[11px] text-blue-600/80 leading-relaxed">
                                    {selectedMethod.toUpperCase() === 'CASH'
                                        ? 'Buyurtma yetkazilganda naqd pul orqali to\'laysiz.'
                                        : 'Online to\'lov tizimi orqali xavfsiz to\'lash mumkin.'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 rounded-b-2xl flex gap-3">
                            <Button
                                variant="outline"
                                onClick={closePaymentModal}
                                className="flex-1 border-gray-200 text-gray-600 font-black h-11 rounded-xl"
                                disabled={isGenerating}
                            >
                                Bekor qilish
                            </Button>
                            <Button
                                onClick={handleConfirmPayment}
                                disabled={!selectedMethod || isGenerating}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-black h-11 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin mr-2" />
                                        Yaratilmoqda...
                                    </>
                                ) : (
                                    `To'lash — ${payModalOrder.total.toLocaleString()} ${tHeader('som')}`
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
