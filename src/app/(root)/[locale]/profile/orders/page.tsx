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
    status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    items: OrderItem[];
}

import { useTranslations } from "next-intl";

export default function OrderHistoryPage() {
    const t = useTranslations('Profile');
    const tCart = useTranslations('Cart');
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
                const userId = user.id || user.phone;
                const res = await fetch(`/api/orders?userId=${userId}`);
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
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">{t('order_history')}</h1>
                    <p className="text-text-muted mt-1 dark:text-gray-400">{t('my_orders')}</p>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [1, 2].map((n) => (
                        <div key={n} className="bg-white h-32 rounded-2xl border border-gray-100 animate-pulse" />
                    ))
                ) : orders.length > 0 ? (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                            <div
                                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold dark:text-white">#{order.id.slice(-8).toUpperCase()}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                                {t(order.status.toLowerCase())}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-muted mt-0.5">{formatDate(order.createdAt)} • {order.items.length} {t('items')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                                    <div>
                                        <p className="text-xs text-text-muted uppercase font-bold tracking-widest">{t('total')}</p>
                                        <p className="text-lg font-bold text-primary">{order.total.toLocaleString()} {t('sum', { currency: "so'm" })}</p>
                                    </div>
                                    <div className="text-text-muted">
                                        {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {expandedOrder === order.id && (
                                <div className="border-t border-gray-100 bg-gray-50/50 p-6 space-y-4 dark:border-gray-700 dark:bg-gray-800/50">
                                    <h3 className="font-bold text-sm text-text-muted uppercase tracking-wider mb-2">{t('order_content')}</h3>
                                    <div className="grid gap-4">
                                        {order.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm line-clamp-1 dark:text-white">{item.title}</p>
                                                        <p className="text-xs text-text-muted">{item.quantity} x {item.price.toLocaleString()} {t('sum', { currency: "so'm" })}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.product ? (
                                                        <Link href={`/product/${item.product.id}`} className="p-2 text-text-muted hover:text-primary transition-colors">
                                                            <ExternalLink size={16} />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-red-400 px-2" title="Product deleted">{t('unavailable')}</span>
                                                    )}
                                                    <Button variant="outline" size="sm" onClick={() => handleReorder(item)} className="h-8 text-xs gap-1">
                                                        <ShoppingCart size={14} /> {t('buy_again')}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-text-muted text-lg font-medium">{t('no_orders')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
