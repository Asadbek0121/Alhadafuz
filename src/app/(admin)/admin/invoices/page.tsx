import { prisma } from "@/lib/prisma";
import { Plus, Eye, FileText, CheckCircle, Truck, Clock, Search } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import InvoiceSearch from "./InvoiceSearch";
import DeleteInvoiceButton from "./DeleteInvoiceButton";
import ExportInvoicesButton from "./ExportInvoicesButton";
import StatusFilter from "./StatusFilter";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminInvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; status?: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect('/auth/login');

    const userRole = (session.user as any).role;
    const userId = session.user.id as string;
    const isVendor = userRole === "VENDOR";

    const { search, status: statusFilter } = await searchParams;

    // Build Where Clause & Fetch stats
    let invoices: any[] = [];
    let totalCount = 0;
    let shippingCount = 0;
    let deliveredCount = 0;
    let pendingCount = 0;

    if (isVendor) {
        // Safe check for vendorId column existence with dual-DB support
        let hasVendorId = false;
        try {
            const columns: any[] = await (prisma as any).$queryRawUnsafe(`
                SELECT column_name FROM information_schema.columns WHERE table_name = 'OrderItem'
            `);
            hasVendorId = columns.some(c => c.column_name === 'vendorId');
        } catch (pgError) {
            try {
                const tableInfo: any[] = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("OrderItem")`);
                hasVendorId = tableInfo.some(c => c.name === 'vendorId');
            } catch (sqliteError) {
                hasVendorId = false;
            }
        }

        if (!hasVendorId) {
            // Safe fallback if column is missing
            totalCount = 0;
            invoices = [];
        } else {
            try {
                // Stats for Vendor using Raw SQL
                const stats: any[] = await (prisma as any).$queryRawUnsafe(`
                    SELECT 
                        COUNT(DISTINCT o.id)::int as total,
                        COUNT(DISTINCT CASE WHEN o.status = 'SHIPPING' THEN o.id END)::int as shipping,
                        COUNT(DISTINCT CASE WHEN o.status = 'DELIVERED' THEN o.id END)::int as delivered,
                        COUNT(DISTINCT CASE WHEN o.status = 'PENDING' THEN o.id END)::int as pending
                    FROM "Order" o
                    JOIN "OrderItem" oi ON o.id = oi."orderId"
                    WHERE oi."vendorId" = $1
                `, userId);

                totalCount = stats[0]?.total || 0;
                shippingCount = stats[0]?.shipping || 0;
                deliveredCount = stats[0]?.delivered || 0;
                pendingCount = stats[0]?.pending || 0;

                // Fetch Invoices using Raw SQL
                let sql = `
                    SELECT DISTINCT o.* 
                    FROM "Order" o
                    JOIN "OrderItem" oi ON o.id = oi."orderId"
                    LEFT JOIN "User" u ON o."userId" = u.id
                    WHERE oi."vendorId" = $1
                `;
                const params: any[] = [userId];

                if (search) {
                    sql += ` AND (o.id ILIKE $2 OR u.name ILIKE $2 OR o."shippingPhone" ILIKE $2)`;
                    params.push(`%${search}%`);
                }
                if (statusFilter && statusFilter !== 'ALL') {
                    sql += ` AND o.status = $${params.length + 1}`;
                    params.push(statusFilter);
                }

                sql += ` ORDER BY o."createdAt" DESC LIMIT 100`;

                invoices = await (prisma as any).$queryRawUnsafe(sql, ...params);
            } catch (queryError) {
                console.error("Vendor invoice query error:", queryError);
                totalCount = 0;
                invoices = [];
            }
        }

        // Match users for the result
        invoices = await Promise.all(invoices.map(async inv => {
            const user = await prisma.user.findUnique({
                where: { id: inv.userId },
                select: { name: true, email: true, image: true, phone: true }
            }).catch(() => null);
            return { ...inv, user: user || { name: 'Mehmon' } };
        }));

    } else {
        // Admin view can use standard Prisma calls
        const where: any = {};
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { shippingPhone: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (statusFilter && statusFilter !== 'ALL') {
            where.status = statusFilter;
        }

        [totalCount, shippingCount, deliveredCount, pendingCount, invoices] = await Promise.all([
            prisma.order.count({ where: {} }),
            prisma.order.count({ where: { status: 'SHIPPING' } }),
            prisma.order.count({ where: { status: 'DELIVERED' } }),
            prisma.order.count({ where: { status: 'PENDING' } }),
            prisma.order.findMany({
                where,
                include: { user: { select: { name: true, email: true, image: true, phone: true } } },
                orderBy: { createdAt: 'desc' },
                take: 100
            })
        ]);
    }

    return (
        <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Invoyslar</h1>
                    <p className="text-gray-500 mt-1">
                        {isVendor ? "Faqat sizning mahsulotlaringiz bo'yicha hujjatlar" : "Barcha tranzaksiyalar va buyurtma hujjatlari"}
                    </p>
                </div>
                <Link href="/admin/orders/create">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95">
                        <Plus size={18} /> Yangi Invoys
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Jami Invoyslar" value={totalCount} icon={<FileText size={22} />} color="blue" />
                <StatCard title="Yetkazilmoqda" value={shippingCount} icon={<Truck size={22} />} color="purple" />
                <StatCard title="Yetkazildi" value={deliveredCount} icon={<CheckCircle size={22} />} color="green" />
                <StatCard title="Kutilmoqda" value={pendingCount} icon={<Clock size={22} />} color="yellow" />
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
                    <InvoiceSearch />
                    <div className="flex gap-2">
                        <ExportInvoicesButton data={invoices} />
                        <StatusFilter />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">ID</th>
                                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Mijoz</th>
                                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Summa</th>
                                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Holat</th>
                                <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sana</th>
                                <th className="px-6 py-4 text-center text-[10px] uppercase font-bold text-gray-400 tracking-wider">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            #{inv.id.slice(-6).toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shadow-sm overflow-hidden text-center truncate">
                                                {inv.user.image ? <img src={inv.user.image} alt="" className="w-full h-full object-cover" /> : inv.user.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900">{inv.user.name || "Mehmon"}</div>
                                                <div className="text-[11px] text-gray-400 font-medium">{inv.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-gray-900">
                                            {inv.total.toLocaleString()} <span className="text-[10px] text-gray-400 font-bold uppercase ml-0.5">so'm</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-500 font-medium">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center items-center gap-2">
                                            <Link href={`/admin/invoices/${inv.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                                                    <Eye size={16} />
                                                </Button>
                                            </Link>
                                            <DeleteInvoiceButton id={inv.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 mb-2">
                                                <Search size={32} />
                                            </div>
                                            <p className="text-gray-900 font-black tracking-tight">Hech qanday ma'lumot topilmadi</p>
                                            <p className="text-sm text-gray-400 max-w-[200px]">Tanlangan filtrlar yoki qidiruv bo'yicha natija yo'q</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: any, color: 'blue' | 'green' | 'yellow' | 'purple' }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100',
        green: 'bg-green-50 text-green-600 border-green-100 shadow-green-100',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100 shadow-yellow-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 shadow-purple-100',
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colors[color]} shadow-lg`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string, color: string }> = {
        'PENDING': { label: 'Kutilmoqda', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
        'AWAITING_PAYMENT': { label: 'To\'lov kutilmoqda', color: 'bg-amber-50 text-amber-700 border-amber-100' },
        'PROCESSING': { label: 'Jarayonda', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        'SHIPPING': { label: 'Yetkazilmoqda', color: 'bg-purple-50 text-purple-700 border-purple-100' },
        'DELIVERED': { label: 'Yetkazildi', color: 'bg-green-50 text-green-700 border-green-100' },
        'CANCELLED': { label: 'Bekor qilindi', color: 'bg-red-50 text-red-700 border-red-100' },
    };

    const config = configs[status] || { label: status, color: 'bg-gray-50 text-gray-700 border-gray-100' };

    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border shadow-sm ${config.color}`}>
            {config.label}
        </span>
    );
}
