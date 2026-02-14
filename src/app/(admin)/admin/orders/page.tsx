import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "./OrderStatusSelect";
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Package, Truck, CreditCard, Search, SlidersHorizontal, Eye, Plus, MapPin } from "lucide-react";
import AutoDispatchButton from "./AutoDispatchButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import BulkLabelPrinter from "@/components/admin/BulkLabelPrinter";
import OrderScanner from "@/components/admin/OrderScanner";
import CancelOrderButton from "./CancelOrderButton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

async function getOrders(where: any, skip: number, take: number, search: string, userId: string, userRole: string) {
    const isVendor = userRole === "VENDOR";

    if (isVendor) {
        const columns: any[] = await (prisma as any).$queryRawUnsafe(`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'
        `);
        const hasVendorId = columns.map(c => c.column_name).includes('vendorId');
        const joinCondition = hasVendorId ? `WHERE p."vendorId" = '${userId}'` : `WHERE 1=0`;

        let sql = `
            SELECT o.*, 
                JSON_AGG(oi.*) as items,
                u.name as "userName", u.email as "userEmail", u.phone as "userPhone"
            FROM "Order" o
            JOIN "OrderItem" oi ON o.id = oi."orderId"
            JOIN "Product" p ON oi."productId" = p.id
            LEFT JOIN "User" u ON o."userId" = u.id
            ${joinCondition}
        `;

        if (where.status) {
            sql += ` AND o.status = '${where.status}'`;
        }

        if (search) {
            sql += ` AND (o.id ILIKE '%${search}%' OR u.name ILIKE '%${search}%' OR u.phone ILIKE '%${search}%')`;
        }

        sql += ` GROUP BY o.id, u.id ORDER BY o."createdAt" DESC LIMIT ${take} OFFSET ${skip}`;

        let countSql = `
            SELECT COUNT(DISTINCT o.id)::int as count 
            FROM "Order" o
            JOIN "OrderItem" oi ON o.id = oi."orderId"
            JOIN "Product" p ON oi."productId" = p.id
            LEFT JOIN "User" u ON o."userId" = u.id
            ${joinCondition}
        `;
        if (where.status) countSql += ` AND o.status = '${where.status}'`;
        if (search) countSql += ` AND (o.id ILIKE '%${search}%' OR u.name ILIKE '%${search}%' OR u.phone ILIKE '%${search}%')`;

        const [orders, countResult]: [any[], any[]] = await Promise.all([
            (prisma as any).$queryRawUnsafe(sql),
            (prisma as any).$queryRawUnsafe(countSql)
        ]);

        const mappedOrders = orders.map(order => ({
            ...order,
            user: { name: (order as any).userName, email: (order as any).userEmail, phone: (order as any).userPhone }
        }));

        return [mappedOrders, countResult[0]?.count || 0];
    }

    const baseWhere: any = {};
    const finalWhere: any = {
        ...where,
        ...baseWhere,
        ...(search ? {
            OR: [
                { id: search },
                ...(search.length < 20 ? [{ id: { endsWith: search } }] : []),
                { user: { name: { contains: search } } },
                { user: { phone: { contains: search } } },
            ]
        } : {})
    };

    return await Promise.all([
        (prisma as any).order.findMany({
            where: finalWhere,
            include: { user: true, items: true },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        (prisma as any).order.count({ where: finalWhere }),
    ]);
}

export default async function AdminOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string; search?: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect('/auth/login');

    const userRole = (session.user as any).role;
    const userId = session.user.id as string;
    const isVendor = userRole === "VENDOR";

    const params = await searchParams;
    const statusFilter = params.status;
    const search = params.search || "";
    const page = parseInt(params.page || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {};

    let orders: any[] = [];
    let total = 0;
    let columns: any[] = [];
    let statsResult: any[] = [];

    try {
        // Run all independent queries in parallel to speed up page load and release connections faster
        const results = await Promise.all([
            getOrders(where, skip, limit, search, userId, userRole),
            (prisma as any).$queryRawUnsafe(`
                SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'
            `),
            (prisma as any).$queryRawUnsafe(`
                SELECT 
                    COUNT(DISTINCT o.id)::int as "all_count",
                    COUNT(DISTINCT CASE WHEN o.status = 'PENDING' THEN o.id END)::int as "pending_count",
                    COUNT(DISTINCT CASE WHEN o.status = 'PROCESSING' THEN o.id END)::int as "processing_count",
                    COUNT(DISTINCT CASE WHEN o.status = 'SHIPPING' THEN o.id END)::int as "shipping_count",
                    COUNT(DISTINCT CASE WHEN o.status = 'DELIVERED' THEN o.id END)::int as "delivered_count"
                FROM "Order" o
                ${isVendor ? 'JOIN "OrderItem" oi ON o.id = oi."orderId" JOIN "Product" p ON oi."productId" = p.id' : ''}
                ${isVendor ? (search ? `LEFT JOIN "User" u ON o."userId" = u.id` : '') : ''}
                WHERE 1=1
                ${isVendor ? (search ? `AND (o.id ILIKE '%${search}%' OR u.name ILIKE '%${search}%' OR u.phone ILIKE '%${search}%')` : '') : ''}
                ${isVendor ? `AND EXISTS (SELECT 1 FROM "OrderItem" oi_v JOIN "Product" p_v ON oi_v."productId" = p_v.id WHERE oi_v."orderId" = o.id AND p_v."vendorId" = '${userId}')` : ''}
            `)
        ]);

        [orders, total] = results[0];
        columns = results[1] as any[];
        statsResult = results[2] as any[];
    } catch (e) {
        console.error("Error fetching orders data:", e);
    }

    const hasVendorId = columns.map(c => c.column_name).includes('vendorId');
    const totalPages = Math.ceil(total / limit);
    const safeOrders = JSON.parse(JSON.stringify(orders));

    const statsData = statsResult[0] || {};
    const stats = [
        { label: "Barchasi", value: "ALL", count: statsData.all_count || 0 },
        { label: "Yangi", value: "PENDING", count: statsData.pending_count || 0 },
        { label: "Jarayonda", value: "PROCESSING", count: statsData.processing_count || 0 },
        { label: "Yo'lda", value: "SHIPPING", count: statsData.shipping_count || 0 },
        { label: "Yetkazildi", value: "DELIVERED", count: statsData.delivered_count || 0 },
    ];

    return (
        <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Buyurtmalar</h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        {isVendor ? "Faqat sizning mahsulotlaringiz mavjud bo'lgan buyurtmalar" : `Jami ${total} ta buyurtma mavjud`}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    {/* Search Bar */}
                    <form className="relative flex-1 lg:min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            name="search"
                            defaultValue={search}
                            placeholder="ID, ism yoki telefon..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        />
                        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                    </form>

                    <div className="flex gap-2">
                        <OrderScanner />
                        <Link href="/admin/orders/create">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-200">
                                <Plus size={18} />
                                Yangi
                            </Button>
                        </Link>
                        <BulkLabelPrinter orders={safeOrders} />
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm w-fit">
                {stats.map((stat) => {
                    const isActive = (!statusFilter && stat.value === 'ALL') || statusFilter === stat.value;
                    return (
                        <Link
                            key={stat.value}
                            href={`/admin/orders?${stat.value !== 'ALL' ? `status=${stat.value}&` : ''}${search ? `search=${search}` : ''}`}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${isActive
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-100'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                }`}
                        >
                            {stat.label}
                            {stat.count > 0 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {stat.count}
                                </span>
                            )}
                        </Link>
                    );
                })}
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
                                            <span>
                                                {isVendor
                                                    ? `${order.items.filter((i: any) => i.vendorId === userId).length} ta mahsulotingiz`
                                                    : `${order.items.length} ta mahsulot`
                                                }
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate">
                                            {isVendor
                                                ? order.items.filter((i: any) => i.vendorId === userId).map((i: any) => i.title).join(', ')
                                                : order.items.map((i: any) => i.title).join(', ')
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                                                <CreditCard size={12} />
                                                {/* Translation Map inline for simplicity */}
                                                {({
                                                    'CASH': 'Naqd',
                                                    'CARD': 'Karta',
                                                    'CLICK': 'Click',
                                                    'PAYME': 'Payme',
                                                    'UZUM': 'Uzum'
                                                } as Record<string, string>)[order.paymentMethod.toUpperCase()] || order.paymentMethod}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                                                <Truck size={12} />
                                                {({
                                                    'COURIER': 'Kuryer',
                                                    'PICKUP': 'Olib ketish'
                                                } as Record<string, string>)[order.deliveryMethod.toUpperCase()] || order.deliveryMethod}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">
                                            {isVendor
                                                ? order.items
                                                    .filter((i: any) => i.vendorId === userId)
                                                    .reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)
                                                    .toLocaleString()
                                                : order.total.toLocaleString()
                                            } so'm
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center gap-1">
                                            <AutoDispatchButton orderId={order.id} currentStatus={order.status} />
                                            <Link href={`/track/${order.id}`} target="_blank">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" title="Tracking Page">
                                                    <MapPin size={16} />
                                                </Button>
                                            </Link>
                                            <Link href={`/admin/orders/${order.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                                                    <Eye size={16} />
                                                </Button>
                                            </Link>
                                            <CancelOrderButton orderId={order.id} status={order.status} />
                                        </div>
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
