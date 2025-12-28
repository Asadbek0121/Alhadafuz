
"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, RefreshCcw, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface PaymentLog {
    id: string;
    provider: string;
    transactionId: string | null;
    amount: number | null;
    status: string;
    requestData: string | null;
    responseData: string | null;
    ipAddress: string | null;
    createdAt: string;
}

export default function PaymentLogsPage() {
    const [selectedLog, setSelectedLog] = useState<PaymentLog | null>(null);

    const { data: logs, isLoading, refetch } = useQuery<PaymentLog[]>({
        queryKey: ['payment-logs'],
        queryFn: async () => {
            const res = await fetch('/api/admin/payment-logs');
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 5000 // Live update every 5 seconds
    });

    const getStatusColor = (status: string) => {
        if (status === 'SUCCESS') return '#16a34a'; // Green
        if (status === 'ERROR' || status === 'SIGNATURE_FAILED') return '#dc2626'; // Red
        return '#ca8a04'; // Yellow/Orange
    };

    const getStatusIcon = (status: string) => {
        if (status === 'SUCCESS') return <CheckCircle size={16} />;
        if (status === 'ERROR' || status === 'SIGNATURE_FAILED') return <ShieldAlert size={16} />;
        return <Clock size={16} />;
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/admin/payments" style={{ padding: '8px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex' }}>
                        <ArrowLeft size={20} color="#64748b" />
                    </Link>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>To'lovlar Tarixi (Audit Log)</h1>
                </div>
                <button onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    <RefreshCcw size={16} />
                    Yangilash
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
                {/* Logs List */}
                <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Vaqt</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Tizim</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>Summa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Yuklanmoqda...</td></tr>}
                            {logs?.map(log => (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    style={{
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        background: selectedLog?.id === log.id ? '#eff6ff' : 'white'
                                    }}
                                >
                                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                                        {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss')}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{log.provider}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                            color: getStatusColor(log.status),
                                            background: `${getStatusColor(log.status)}15`
                                        }}>
                                            {getStatusIcon(log.status)}
                                            {log.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600' }}>
                                        {log.amount ? log.amount.toLocaleString() : '-'} so'm
                                    </td>
                                </tr>
                            ))}
                            {logs?.length === 0 && <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Hozircha loglar yo'q</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Details Panel */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'sticky', top: '24px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>Detallar</h3>

                    {selectedLog ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tranzaksiya ID</span>
                                <div style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '8px', borderRadius: '6px', fontSize: '13px', wordBreak: 'break-all' }}>
                                    {selectedLog.transactionId || 'N/A'}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>IP Manzil</span>
                                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                    {selectedLog.ipAddress || 'Unknown'}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>So'rov Ma'lumotlari (RAW)</span>
                                <div style={{
                                    background: '#0f172a', color: '#22c55e', padding: '12px', borderRadius: '8px',
                                    fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', maxHeight: '200px'
                                }}>
                                    {selectedLog.requestData || '{}'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                            Log ustiga bosing
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
