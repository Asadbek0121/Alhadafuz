import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "./OrderStatusSelect";
import { format } from 'date-fns';
import { unstable_cache } from "next/cache";
import { ChevronLeft, ChevronRight, Package, Truck, CreditCard, Search, SlidersHorizontal, Eye } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BulkLabelPrinter from "@/components/admin/BulkLabelPrinter";
import OrderScanner from "@/components/admin/OrderScanner";

const getOrders = unstable_cache(
    async (where: any, skip: number, take: number, search: string) => {
        const finalWhere = {
            ...where,
            ...(search ? {
                OR: [
                    // { deliveryToken: search }, // Temporarily disabled
                    { id: search },
                    ...(search.length < 20 ? [{ id: { endsWith: search } }] : []),
                    { user: { name: { contains: search } } },
                    { user: { phone: { contains: search } } },
                ]
            } : {})
        };

        return await Promise.all([
            prisma.order.findMany({
                where: finalWhere,
                include: { user: true, items: true },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.order.count({ where: finalWhere }),
        ]);
    },
    ['admin-orders-list'],
    { tags: ['orders'] }
);

export default async function AdminOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string; search?: string }>;
}) {
    const params = await searchParams;
    const statusFilter = params.status;
    const search = params.search || "";
    const page = parseInt(params.page || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {};

    const [orders, total] = await getOrders(where, skip, limit, search);
    const totalPages = Math.ceil(total / limit);

    const stats = [
        { label: "Barchasi", value: "ALL", count: await prisma.order.count() },
        { label: "Yangi", value: "PENDING", count: await prisma.order.count({ where: { status: "PENDING" } }) },
        { label: "Yetkazildi", value: "DELIVERED", count: await prisma.order.count({ where: { status: "DELIVERED" } }) },
    ];

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Buyurtmalar</h1>
                    <p className="text-muted-foreground mt-1">Jami {total} ta buyurtma</p>
                </div>

                <div className="flex gap-2 items-center">
                    <OrderScanner />
                    <BulkLabelPrinter orders={orders} />

                    <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
                        {stats.map((stat) => (
                            <Link
                                key={stat.value}
                                href={`/admin/orders${stat.value !== 'ALL' ? `?status=${stat.value}` : ''}`}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${(!statusFilter && stat.value === 'ALL') || statusFilter === stat.value
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'hover:bg-gray-100 text-gray-600'
                                    }`}
                            >
                                {stat.label} <span className="ml-1 opacity-70 text-xs">({stat.count})</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 border-b text-xs uppercase text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Mijoz</th>
                                <th className="px-6 py-4">Mahsulotlar</th>
                                <th className="px-6 py-4">To'lov & Yetkazish</th>
                                <th className="px-6 py-4">Jami</th>
                                <th className="px-6 py-4">Holat</th>
                                <th className="px-6 py-4 text-center">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                        #{order.id.slice(-8)}
                                        <div className="mt-1 text-[10px] text-gray-400">
                                            {format(new Date(order.createdAt), 'dd MMM, HH:mm')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                                {(order.user?.name || "M").charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{order.user?.name || "Mehmon"}</div>
                                                <div className="text-xs text-gray-500">{(order as any).shippingPhone || order.user?.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Package size={16} />
                                            <span>{order.items.length} ta mahsulot</span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate">
                                            {order.items.map(i => i.title).join(', ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                                                <CreditCard size={12} />
                                                {/* Translation Map inline for simplicity */}
                                                {{
                                                    'CASH': 'Naqd',
                                                    'CARD': 'Karta',
                                                    'CLICK': 'Click',
                                                    'PAYME': 'Payme',
                                                    'UZUM': 'Uzum'
                                                }[order.paymentMethod.toUpperCase()] || order.paymentMethod}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                                                <Truck size={12} />
                                                {{
                                                    'COURIER': 'Kuryer',
                                                    'PICKUP': 'Olib ketish'
                                                }[order.deliveryMethod.toUpperCase()] || order.deliveryMethod}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">
                                            {order.total.toLocaleString()} so'm
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link href={`/admin/orders/${order.id}`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {orders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-gray-50/30">
                        <Package size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">Buyurtmalar topilmadi</p>
                    </div>
                )}

                {/* Pagination */}
                <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        Jami {total} tadan {skip + 1}-{Math.min(skip + limit, total)} ko'rsatilmoqda
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/admin/orders?page=${Math.max(1, page - 1)}&status=${statusFilter || 'ALL'}`}>
                            <Button variant="outline" size="sm" disabled={page <= 1} className="h-8 w-8 p-0">
                                <ChevronLeft size={14} />
                            </Button>
                        </Link>
                        <Link href={`/admin/orders?page=${Math.min(totalPages, page + 1)}&status=${statusFilter || 'ALL'}`}>
                            <Button variant="outline" size="sm" disabled={page >= totalPages} className="h-8 w-8 p-0">
                                <ChevronRight size={14} />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
