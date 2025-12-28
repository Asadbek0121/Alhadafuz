import { prisma } from "@/lib/prisma";
import AdminCharts from "./AdminCharts";
import RecentOrdersTable from "./RecentOrdersTable";
import Link from "next/link";
import { Circle, UserCircle, ShoppingCart, Users, DollarSign, Package } from 'lucide-react';

async function getData() {
    // Global prisma instance from lib/prisma
    const userCount = await prisma.user.count();
    const orderCount = await prisma.order.count({
        where: {
            status: { not: 'CANCELLED' }
        }
    });
    // Cast to any if types are not perfectly updated in IDE yet, but runtime should work
    const productCount = await (prisma as any).product.count();

    const revenue = await prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true }
    });
    const totalRevenue = revenue._sum.total || 0;

    const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true }
    });

    const recentMessages = await (prisma as any).message.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { sender: true }
    });

    const allOrders = await prisma.order.findMany({
        select: { createdAt: true, total: true, status: true },
        orderBy: { createdAt: 'asc' }
    });

    return {
        stats: { userCount, orderCount, productCount, totalRevenue },
        recentOrders,
        recentMessages,
        allOrders
    };
}

export default async function AdminDashboard() {
    const { stats, recentOrders, recentMessages, allOrders } = await getData();

    return (
        <div>
            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '30px' }}>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#ecf2ff', color: '#0085db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#5A6A85', fontWeight: '500' }}>Jami Tushum</p>
                        <h4 style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: '700', color: '#2A3547' }}>{stats.totalRevenue.toLocaleString()} <span style={{ fontSize: '12px' }}>uzs</span></h4>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fef5e5', color: '#ffae1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#5A6A85', fontWeight: '500' }}>Buyurtmalar</p>
                        <h4 style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: '700', color: '#2A3547' }}>{stats.orderCount} <span style={{ fontSize: '12px' }}>ta</span></h4>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#e6fffa', color: '#00ceb6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#5A6A85', fontWeight: '500' }}>Mijozlar</p>
                        <h4 style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: '700', color: '#2A3547' }}>{stats.userCount} <span style={{ fontSize: '12px' }}>ta</span></h4>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fdede8', color: '#fa896b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#5A6A85', fontWeight: '500' }}>Mahsulotlar</p>
                        <h4 style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: '700', color: '#2A3547' }}>{stats.productCount} <span style={{ fontSize: '12px' }}>ta</span></h4>
                    </div>
                </div>
            </div>

            {/* Charts Area */}
            <AdminCharts stats={stats} chartData={allOrders} />

            {/* Bottom Grid: Recent Chats & Product Performance */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>
                {/* Recent Chats Widget */}
                <div style={{ gridColumn: 'span 4', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547' }}>So'nggi xabarlar</h3>
                        <Link href="/admin/chat" style={{ fontSize: '12px', color: '#00a1ff', fontWeight: '600' }}>Hammasini ko'rish</Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {recentMessages.length === 0 ? (
                            <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Xabarlar yo'q</div>
                        ) : (
                            recentMessages.map((msg: any) => (
                                <div key={msg.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', overflow: 'hidden', background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {msg.sender?.image ? (
                                            <img src={msg.sender.image} alt={msg.sender.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <UserCircle size={30} color="#0085db" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2A3547' }}>{msg.sender?.name || 'Foydalanuvchi'}</h6>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#5A6A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{msg.content}</p>
                                    </div>
                                    <span suppressHydrationWarning style={{ fontSize: '11px', color: '#999' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Orders Table */}
                <div style={{ gridColumn: 'span 8' }}>
                    <RecentOrdersTable orders={recentOrders} />
                </div>
            </div>
        </div>
    );
}
