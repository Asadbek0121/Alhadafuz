import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "./OrderStatusSelect";
import { format } from 'date-fns';
import { unstable_cache } from "next/cache";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const getOrders = unstable_cache(
    async (where: any, skip: number, take: number) => {
        return await Promise.all([
            prisma.order.findMany({
                where,
                include: { user: true, items: true },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.order.count({ where }),
        ]);
    },
    ['admin-orders-list'],
    { tags: ['orders'] }
);

export default async function AdminOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; page?: string }>;
}) {
    const params = await searchParams;
    const statusFilter = params.status;
    const page = parseInt(params.page || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {};

    const [orders, total] = await getOrders(where, skip, limit);
    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            <div style={{ marginBottom: "24px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Buyurtmalar</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <a href="/admin/orders" style={{ padding: '6px 12px', borderRadius: '6px', background: !statusFilter || statusFilter === 'ALL' ? '#0066cc' : '#eee', color: !statusFilter || statusFilter === 'ALL' ? 'white' : 'black', textDecoration: 'none', fontSize: '14px' }}>Barchasi</a>
                    <a href="/admin/orders?status=PENDING" style={{ padding: '6px 12px', borderRadius: '6px', background: statusFilter === 'PENDING' ? '#0066cc' : '#eee', color: statusFilter === 'PENDING' ? 'white' : 'black', textDecoration: 'none', fontSize: '14px' }}>Yangi</a>
                    <a href="/admin/orders?status=DELIVERED" style={{ padding: '6px 12px', borderRadius: '6px', background: statusFilter === 'DELIVERED' ? '#0066cc' : '#eee', color: statusFilter === 'DELIVERED' ? 'white' : 'black', textDecoration: 'none', fontSize: '14px' }}>Yetkazilgan</a>
                </div>
            </div>

            <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8f9fa" }}>
                        <tr>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px" }}>ID</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px" }}>Mijoz</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px" }}>Jami</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px" }}>Holat</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px" }}>Sana</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "16px", fontFamily: "monospace", fontSize: "12px" }}>
                                    {order.id.slice(-8)}
                                </td>
                                <td style={{ padding: "16px" }}>
                                    <div style={{ fontWeight: "500" }}>{order.user?.name || "Mehmon"}</div>
                                    <div style={{ fontSize: "12px", color: "#666" }}>{(order as any).shippingPhone || order.user?.phone}</div>
                                </td>
                                <td style={{ padding: "16px", fontWeight: "600" }}>
                                    {order.total.toLocaleString()} so'm
                                </td>
                                <td style={{ padding: "16px" }}>
                                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                                </td>
                                <td style={{ padding: "16px", color: "#666", fontSize: "12px" }}>
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Buyurtmalar topilmadi</div>
                )}
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "24px" }}>
                {page > 1 && (
                    <Link href={`/admin/orders?page=${page - 1}&status=${statusFilter || 'ALL'}`} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={16} />
                    </Link>
                )}
                <span style={{ padding: "8px 16px", color: "#666" }}>
                    Sahifa {page} / {totalPages || 1}
                </span>
                {page < totalPages && (
                    <Link href={`/admin/orders?page=${page + 1}&status=${statusFilter || 'ALL'}`} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", display: 'flex', alignItems: 'center' }}>
                        <ChevronRight size={16} />
                    </Link>
                )}
            </div>
        </div>
    );
}
