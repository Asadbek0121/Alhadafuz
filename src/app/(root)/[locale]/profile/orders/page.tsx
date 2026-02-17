"use client";

import { useEffect, useState } from "react";
import { Package, ChevronDown, ChevronUp, Search, Filter, ShoppingCart, ExternalLink } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
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
    product?: Product | null; // Optional relation
    productId: string;
}

interface Order {
    id: string;
    createdAt: string;
    total: number;
    status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "AWAITING_PAYMENT";
    items: OrderItem[];
    paymentUrl?: string | null;
    paymentMethod: string;
    deliveryFee?: number;
}

import { useTranslations, useLocale } from "next-intl";

export default function OrderHistoryPage() {
    const t = useTranslations('Profile');
    const tCart = useTranslations('Cart');
    const tHeader = useTranslations('Header');
    const locale = useLocale();
    const [isLoading, setIsLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const { user, isAuthenticated } = useUserStore();
    const { addToCart } = useCartStore();

    useEffect(() => {
        const fetchOrders = async () => {
            if (!isAuthenticated || !user) {
                setIsLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/orders`);
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

        const timer = setTimeout(fetchOrders, 800);
        return () => clearTimeout(timer);
    }, [user, isAuthenticated]);

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
                                            <span className="font-bold text-[13px] md:text-base text-gray-900">#{order.id.slice(-6).toUpperCase()}</span>
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
                                        {order.status === 'AWAITING_PAYMENT' && order.paymentUrl && (
                                            <Button
                                                size="sm"
                                                className="bg-amber-500 hover:bg-amber-600 text-white font-black h-7 md:h-9 px-2.5 md:px-4 rounded-lg text-[10px] md:text-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = order.paymentUrl!;
                                                }}
                                            >
                                                {t('pay_now').toUpperCase()}
                                            </Button>
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
        </div>
    );
}
