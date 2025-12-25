"use client";

import { MoreVertical } from 'lucide-react';
import Link from 'next/link';

export default function RecentOrdersTable({ orders }: { orders: any[] }) {
    return (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', margin: 0 }}>So'nggi buyurtmalar</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#5A6A85' }}>Oxirgi kelib tushgan buyurtmalar</p>
                </div>
                <Link href="/admin/orders" style={{ fontSize: '12px', color: '#00a1ff', fontWeight: '600' }}>
                    Ko'proq
                </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #e5eaef' }}>
                            <th style={{ padding: '15px 0', fontSize: '12px', fontWeight: '600', color: '#5A6A85', textTransform: 'uppercase' }}>ID</th>
                            <th style={{ padding: '15px 0', fontSize: '12px', fontWeight: '600', color: '#5A6A85', textTransform: 'uppercase' }}>Mijoz</th>
                            <th style={{ padding: '15px 0', fontSize: '12px', fontWeight: '600', color: '#5A6A85', textTransform: 'uppercase' }}>Holati</th>
                            <th style={{ padding: '15px 0', fontSize: '12px', fontWeight: '600', color: '#5A6A85', textTransform: 'uppercase' }}>Summa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Buyurtmalar mavjud emas</td>
                            </tr>
                        ) : (
                            orders.map((order, i) => (
                                <tr key={order.id} style={{ borderBottom: i === orders.length - 1 ? 'none' : '1px solid #e5eaef' }}>
                                    <td style={{ padding: '15px 0' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#2A3547' }}>#{order.id.slice(-6)}</span>
                                    </td>
                                    <td style={{ padding: '15px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#e6f4ff', overflow: 'hidden' }}>
                                                <img
                                                    src={order.user?.image || `https://ui-avatars.com/api/?name=${order.user?.name || 'User'}&background=random`}
                                                    alt="user"
                                                    style={{ width: '100%', height: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2A3547' }}>{order.user?.name || 'Mijoz'}</h6>
                                                <span style={{ fontSize: '12px', color: '#5A6A85' }}>{order.user?.email || 'email yo\'q'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 0' }}>
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            padding: '4px 10px',
                                            borderRadius: '4px',
                                            background: order.status === 'COMPLETED' ? '#e6fffa' : order.status === 'PENDING' ? '#fbf2ef' : '#ecf2ff',
                                            color: order.status === 'COMPLETED' ? '#00ceb6' : order.status === 'PENDING' ? '#fa896b' : '#0085db',
                                        }}>
                                            {order.status === 'PENDING' ? 'Kutilmoqda' : order.status === 'COMPLETED' ? 'Yetkazildi' : order.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 0' }}>
                                        <h6 suppressHydrationWarning style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#2A3547' }}>
                                            {new Intl.NumberFormat('uz-UZ').format(order.total)} so'm
                                        </h6>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
