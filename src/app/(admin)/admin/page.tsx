import { prisma } from "@/lib/prisma";
import AdminCharts from "./AdminCharts";
import RecentOrdersTable from "./RecentOrdersTable";
import Link from "next/link";
import {
    Circle, UserCircle, ShoppingCart, Users, DollarSign,
    Package, Plus, TrendingUp, MessageSquare, Tag, Image as ImageIcon,
    Settings as SettingsIcon, FileText
} from 'lucide-react';

async function getData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let userCount = 0;
    let todayUserCount = 0;
    let orderCount = 0;
    let todayOrderCount = 0;
    let productCount = 0;
    let totalRevenue = 0;
    let todayRevenue = 0;
    let recentOrders: any[] = [];
    let recentMessages: any[] = [];
    let allOrders: any[] = [];
    let topProducts: any[] = [];

    try {
        [userCount, todayUserCount] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: today } } })
        ]);

        [orderCount, todayOrderCount] = await Promise.all([
            prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
            prisma.order.count({ where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } } })
        ]);

        productCount = await (prisma as any).product.count({ where: { isDeleted: false } });

        const [revenue, tRevenue] = await Promise.all([
            prisma.order.aggregate({
                where: { status: { not: 'CANCELLED' } },
                _sum: { total: true }
            }),
            prisma.order.aggregate({
                where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } },
                _sum: { total: true }
            })
        ]);
        totalRevenue = revenue._sum.total || 0;
        todayRevenue = tRevenue._sum.total || 0;

        recentOrders = await prisma.order.findMany({
            take: 6,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });

        recentMessages = await (prisma as any).message.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { sender: true }
        });

        allOrders = await prisma.order.findMany({
            select: { createdAt: true, total: true, status: true },
            orderBy: { createdAt: 'asc' }
        });

        // Simplified Top Products (by item count in recent orders)
        const orderItems = await (prisma as any).orderItem.findMany({
            take: 50,
            orderBy: { id: 'desc' },
            select: { title: true, price: true, quantity: true, productId: true, image: true }
        });

        const productMap: any = {};
        orderItems.forEach((item: any) => {
            if (!productMap[item.productId]) {
                productMap[item.productId] = { ...item, sales: 0 };
            }
            productMap[item.productId].sales += item.quantity;
        });
        topProducts = Object.values(productMap).sort((a: any, b: any) => b.sales - a.sales).slice(0, 5);

    } catch (e) {
        console.error("Error fetching dashboard data:", e);
    }

    return {
        stats: { userCount, todayUserCount, orderCount, todayOrderCount, productCount, totalRevenue, todayRevenue },
        recentOrders,
        recentMessages,
        allOrders,
        topProducts
    };
}

export default async function AdminDashboard() {
    const data = await getData();

    // Sanitize data
    const stats = JSON.parse(JSON.stringify(data.stats));
    const recentOrders = JSON.parse(JSON.stringify(data.recentOrders));
    const recentMessages = JSON.parse(JSON.stringify(data.recentMessages));
    const allOrders = JSON.parse(JSON.stringify(data.allOrders));
    const topProducts = JSON.parse(JSON.stringify(data.topProducts));

    const statCards = [
        {
            title: "Jami Tushum",
            value: stats.totalRevenue,
            today: stats.todayRevenue,
            unit: "uzs",
            icon: DollarSign,
            color: "#0085db",
            bg: "#ecf2ff"
        },
        {
            title: "Buyurtmalar",
            value: stats.orderCount,
            today: stats.todayOrderCount,
            unit: "ta",
            icon: ShoppingCart,
            color: "#ffae1f",
            bg: "#fef5e5"
        },
        {
            title: "Mijozlar",
            value: stats.userCount,
            today: stats.todayUserCount,
            unit: "ta",
            icon: Users,
            color: "#00ceb6",
            bg: "#e6fffa"
        },
        {
            title: "Mahsulotlar",
            value: stats.productCount,
            today: 0,
            unit: "ta",
            icon: Package,
            color: "#fa896b",
            bg: "#fdede8"
        },
    ];

    const quickActions = [
        { label: "Yangi Mahsulot", icon: Plus, href: "/admin/products/new", color: "#4361ee" },
        { label: "Kategoriyalar", icon: Tag, href: "/admin/categories", color: "#3a0ca3" },
        { label: "Bannerlar", icon: ImageIcon, href: "/admin/banners", color: "#7209b7" },
        { label: "Hisobotlar", icon: FileText, href: "/admin/invoices", color: "#4cc9f0" },
        { label: "Sozlamalar", icon: SettingsIcon, href: "/admin/settings", color: "#560bad" },
        { label: "Xabarlar", icon: MessageSquare, href: "/admin/chat", color: "#f72585" },
    ];

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#2A3547', margin: 0 }}>Boshqaruv Paneli</h2>
                <p style={{ color: '#5A6A85', margin: '4px 0 0', fontSize: '14px' }}>Xush kelibsiz! Do'koningizdagi so'nggi holat bilan tanishing.</p>
            </div>

            {/* Top Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {statCards.map((card, i) => (
                    <div key={i} style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <card.icon size={24} strokeWidth={2.5} />
                            </div>
                            {card.today > 0 && (
                                <div style={{ background: '#e6fffa', color: '#00ceb6', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <TrendingUp size={12} />
                                    +{card.today.toLocaleString()} bugun
                                </div>
                            )}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#5A6A85', fontWeight: '600' }}>{card.title}</p>
                            <h4 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: '800', color: '#2A3547' }}>
                                {card.unit === "uzs" ? card.value.toLocaleString() : card.value}
                                <span style={{ fontSize: '14px', fontWeight: '500', color: '#8E98A8', marginLeft: '4px' }}>{card.unit}</span>
                            </h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Grid */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', marginBottom: '20px' }}>Tezkor amallar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                    {quickActions.map((action, i) => (
                        <Link
                            key={i}
                            href={action.href}
                            style={{
                                background: '#fff',
                                padding: '16px',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                border: '1px solid #f0f0f0',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}
                            className="hover-action"
                        >
                            <div style={{ color: action.color }}>
                                <action.icon size={26} strokeWidth={2} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#2A3547' }}>{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Charts Area */}
            <AdminCharts stats={stats} chartData={allOrders} />

            {/* Bottom Grid: Recent Chats & Top Products */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px' }}>
                {/* Recent Chats Widget */}
                <div style={{ gridColumn: 'span 4', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547' }}>So'nggi xabarlar</h3>
                        <Link href="/admin/chat" style={{ fontSize: '12px', color: '#4361ee', fontWeight: '700' }}>Barchasi</Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {recentMessages.length === 0 ? (
                            <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>Xabarlar yo'q</div>
                        ) : (
                            recentMessages.map((msg: any) => (
                                <div key={msg.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', background: '#f5f7fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {msg.sender?.image ? (
                                            <img src={msg.sender.image} alt={msg.sender.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <UserCircle size={24} color="#5A6A85" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2A3547' }}>{msg.sender?.name || 'Foydalanuvchi'}</h6>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#5A6A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.content}</p>
                                    </div>
                                    <span suppressHydrationWarning style={{ fontSize: '10px', color: '#999', fontWeight: '500' }}>
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

            {/* Top Products Section */}
            <div style={{ marginTop: '30px', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #f0f0f0' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', marginBottom: '20px' }}>Top Mahsulotlar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {topProducts.map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: '#f5f7fb', overflow: 'hidden', padding: '4px' }}>
                                <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <h6 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#2A3547', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</h6>
                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#00ceb6', fontWeight: '700' }}>{p.sales} ta sotilgan</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .hover-action:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.06) !important;
                    border-color: #e0e0e0 !important;
                }
            `}</style>
        </div>
    );
}

