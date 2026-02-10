
import { prisma } from "@/lib/prisma";
import { Plus, Search, Eye, Trash2, FileText, CheckCircle, Truck, Clock } from 'lucide-react';
import Link from "next/link";

export default async function AdminInvoicesPage() {
    // Determine Mock or Real Statuses
    // Assuming Order statuses: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED

    const totalCount = await prisma.order.count();
    const shippedCount = await prisma.order.count({ where: { status: 'SHIPPED' } }); // Adjust status if needed
    const deliveredCount = await prisma.order.count({ where: { status: 'DELIVERED' } });
    const pendingCount = await prisma.order.count({ where: { status: 'PENDING' } });

    const invoices = await prisma.order.findMany({
        include: {
            user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return (
        <div>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '30px' }}>
                <StatCard title="Jami" value={totalCount} icon={<FileText size={24} color="#0085db" />} bg="#ecf2ff" />
                <StatCard title="Yuborilgan" value={shippedCount} icon={<Truck size={24} color="#00ceb6" />} bg="#e6fffa" />
                <StatCard title="Yetkazildi" value={deliveredCount} icon={<CheckCircle size={24} color="#13deb9" />} bg="#e6fffa" />
                <StatCard title="Kutilmoqda" value={pendingCount} icon={<Clock size={24} color="#ffae1f" />} bg="#fef5e5" />
            </div>

            {/* Content Area */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <input
                            placeholder="Invoyslarni qidirish..."
                            style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none' }}
                        />
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#5A6A85' }} />
                    </div>
                    <Link href="/admin/invoices/add" style={{ background: '#0085db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
                        <Plus size={18} /> Invoys yaratish
                    </Link>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5eaef' }}>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}><input type="checkbox" /></th>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}>ID</th>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}>KIMDAN (BILL FROM)</th>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}>KIMGA (BILL TO)</th>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}>SUMMA</th>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}>STATUS</th>
                                <th style={{ padding: '15px', color: '#5A6A85', fontWeight: 600, fontSize: '14px' }}>AMALLAR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid #e5eaef' }}>
                                    <td style={{ padding: '15px' }}><input type="checkbox" /></td>
                                    <td style={{ padding: '15px', fontWeight: 600, color: '#0085db' }}>#{inv.id.slice(-6).toUpperCase()}</td>
                                    <td style={{ padding: '15px', color: '#2A3547' }}>UzMarket</td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${inv.user.name || 'User'}&background=random`}
                                                style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                                            />
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#2A3547' }}>{inv.user.name || "Noma'lum"}</div>
                                                <div style={{ fontSize: '12px', color: '#5A6A85' }}>{inv.user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px', color: '#2A3547' }}>{inv.total.toLocaleString()} so'm</td>
                                    <td style={{ padding: '15px' }}>
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Link href={`/admin/invoices/${inv.id}`} style={{ color: '#0085db' }}>
                                                <Eye size={18} />
                                            </Link>
                                            <Link href={`/admin/invoices/${inv.id}/edit`} style={{ color: '#00ceb6' }}>
                                                <FileText size={18} />
                                            </Link>
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fa896b' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Ma'lumot topilmadi</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, bg }: { title: string, value: number, icon: any, bg: string }) {
    return (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <div>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#5A6A85', fontWeight: 500 }}>{title}</h4>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#2A3547', marginTop: '4px' }}>{value}</div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    let bg = '#ecf2ff';
    let color = '#0085db';
    let text = status;

    switch (status) {
        case 'PENDING':
            bg = '#fef5e5';
            color = '#ffae1f';
            text = 'Kutilmoqda';
            break;
        case 'DELIVERED':
            bg = '#e6fffa';
            color = '#13deb9';
            text = 'Yetkazildi';
            break;
        case 'SHIPPED':
            bg = '#ecf2ff';
            color = '#5d87ff';
            text = 'Yuborilgan';
            break;
        case 'CANCELLED':
            bg = '#fdede8';
            color = '#fa896b';
            text = 'Bekor qilindi';
            break;
        case 'AWAITING_PAYMENT':
            bg = '#fff8e1';
            color = '#ffb020';
            text = "To'lov kutilmoqda";
            break;
    }

    return (
        <span style={{ background: bg, color: color, padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
            {text}
        </span>
    );
}
