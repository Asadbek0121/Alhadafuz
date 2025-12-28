"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AdminCharts({ stats, chartData = [] }: { stats: any, chartData?: any[] }) {
    // Process chartData for Revenue Updates (Daily)
    const dataRevenue = useMemo(() => {
        if (!chartData.length) return [];
        // Group by day (YYYY-MM-DD)
        const daily = chartData.reduce((acc: any, order: any) => {
            const date = new Date(order.createdAt).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + order.total;
            return acc;
        }, {});
        // Transform to array and sort, take last 7-10 days
        return Object.entries(daily)
            .map(([name, uv]) => ({ name: name.slice(5), uv })) // slice to remove YYYY- for shorter label
            .slice(-7);
    }, [chartData]);

    // Process chartData for Cancelled Orders (Monthly)
    const dataCancelled = useMemo(() => {
        if (!chartData.length) return [];
        const monthly = chartData.reduce((acc: any, order: any) => {
            if (order.status !== 'CANCELLED') return acc;
            const date = new Date(order.createdAt);
            const key = date.toLocaleString('default', { month: 'short' });
            acc[key] = (acc[key] || 0) + 1; // Count
            return acc;
        }, {});
        return Object.entries(monthly).map(([name, uv]) => ({ name, uv }));
    }, [chartData]);

    // Simple Pie Data (e.g. Orders vs Products counts as we don't have deep breakdown)
    const dataBreakup = [
        { name: 'Buyurtmalar', value: stats.orderCount },
        { name: 'Mahsulotlar', value: stats.productCount },
        { name: 'Foydalanuvchilar', value: stats.userCount },
    ];
    const COLORS = ['#0085db', '#e6fffa', '#ffae1f'];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '30px', marginBottom: '30px' }}>
            {/* Revenue Updates - Area Chart */}
            <div style={{ gridColumn: 'span 8', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', margin: 0 }}>Tushum statistikasi</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#5A6A85' }}>Kunlik daromad (so'nggi 7 kun)</p>
                    </div>
                </div>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataRevenue.length ? dataRevenue : [{ name: 'Mavjud emas', uv: 0 }]}>
                            <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0085db" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#0085db" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5eaef" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#5A6A85', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5A6A85', fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} formatter={(value: any) => new Intl.NumberFormat('uz-UZ').format(value) + " so'm"} />
                            <Area type="monotone" dataKey="uv" stroke="#0085db" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Yearly Breakup - Pie Chart & Cancelled Orders Bar */}
            <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Pie Chart: General Stats */}
                <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', margin: 0 }}>Umumiy holat</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginTop: '20px' }}>
                        <div>
                            <h2 suppressHydrationWarning style={{ fontSize: '24px', fontWeight: '800', color: '#2A3547', margin: 0 }}>
                                {new Intl.NumberFormat('uz-UZ').format(stats.totalRevenue)}
                            </h2>
                            <p style={{ margin: 0, fontSize: '12px', color: '#5A6A85' }}>Umumiy tushum</p>
                        </div>
                        <div style={{ width: '120px', height: '120px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dataBreakup} innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                                        {dataBreakup.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Cancelled Orders - Bar Chart */}
                <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2A3547', margin: 0 }}>Bekor qilingan</h3>
                        <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                            {dataCancelled.reduce((a: any, b: any) => a + b.uv, 0)} ta
                        </span>
                    </div>
                    <div style={{ marginTop: '20px', height: '60px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataCancelled.length ? dataCancelled : [{ name: 'Bo\'sh', uv: 0 }]}>
                                <Bar dataKey="uv" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
