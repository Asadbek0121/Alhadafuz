"use client";

import { useParams, useRouter } from "next/navigation";
import { Printer, Download, ArrowLeft } from "lucide-react";

export default function ViewInvoicePage() {
    const { id } = useParams();
    const router = useRouter();

    // Mock Data
    const invoice = {
        id: id || "101",
        status: "Delivered",
        date: "2023-11-20",
        billFrom: { name: "UzMarket", address: "Tashkent, Uzbekistan", email: "info@uzmarket.uz", phone: "+998 90 123 45 67" },
        billTo: { name: "John Doe", address: "Samarkand, Uzbekistan", email: "john@example.com", phone: "+998 93 333 22 11" },
        items: [
            { id: 1, name: "iPhone 13 Pro", cost: 12000000, qty: 1 },
            { id: 2, name: "Silicone Case", cost: 150000, qty: 2 }
        ],
        subTotal: 12300000,
        vat: 0,
        grandTotal: 13530000
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusConfig = (status: string) => {
        const normalizedStatus = status.toUpperCase();
        switch (normalizedStatus) {
            case 'PENDING':
            case 'KUTILMOQDA':
                return { text: 'Kutilmoqda', bg: '#fef5e5', color: '#ffae1f' };
            case 'DELIVERED':
            case 'YETKAZIB BERILDI':
            case 'YETKAZILDI':
                return { text: 'Yetkazib berildi', bg: '#e6fffa', color: '#13deb9' };
            case 'SHIPPED':
            case 'YUBORILGAN':
            case 'PROCESSING':
            case 'JARAYONDA':
                return { text: 'Yuborildi', bg: '#ecf2ff', color: '#5d87ff' };
            case 'AWAITING_PAYMENT':
            case "TO'LOV KUTILMOQDA":
                return { text: "To'lov kutilmoqda", bg: '#fff8e1', color: '#ffb020' };
            case 'CANCELLED':
            case 'BEKOR QILINDI':
                return { text: 'Bekor qilindi', bg: '#fdede8', color: '#fa896b' };
            default:
                return { text: status, bg: '#ecf2ff', color: '#5d87ff' };
        }
    };

    const statusConfig = getStatusConfig(invoice.status);

    return (
        <div style={{ padding: "0" }}>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .no-print {
                        display: none !important;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 20px;
                        background: white;
                        box-shadow: none !important;
                        border-radius: 0;
                    }
                }
            `}</style>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Hisob-faktura #{invoice.id}</h1>
                    <span style={{ background: statusConfig.bg, color: statusConfig.color, padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                        {statusConfig.text}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => router.push(`/admin/invoices/${id}/edit`)} style={{ background: '#ecf2ff', color: '#0085db', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Tahrirlash
                    </button>
                    <button onClick={() => router.back()} style={{ background: '#fa896b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeft size={16} /> Orqaga
                    </button>
                </div>
            </div>

            <div id="printable-area" style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>

                {/* Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>Buyurtma sanasi:</span>
                        <span style={{ fontWeight: 600, color: '#2A3547' }}>{invoice.date}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>Buyurtma holati:</span>
                        <span style={{ fontWeight: 600, color: statusConfig.color }}>{statusConfig.text}</span>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '40px' }} />

                {/* Addresses */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', marginBottom: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '15px', color: '#2A3547', fontSize: '16px' }}>Kimdan</h4>
                        <div style={{ fontSize: '14px', color: '#5A6A85', lineHeight: '1.6' }}>
                            <strong style={{ color: '#2A3547' }}>{invoice.billFrom.name}</strong><br />
                            {invoice.billFrom.email}<br />
                            {invoice.billFrom.address}<br />
                            {invoice.billFrom.phone}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '15px', color: '#2A3547', fontSize: '16px' }}>Kimga</h4>
                        <div style={{ fontSize: '14px', color: '#5A6A85', lineHeight: '1.6' }}>
                            <strong style={{ color: '#2A3547' }}>{invoice.billTo.name}</strong><br />
                            {invoice.billTo.email}<br />
                            {invoice.billTo.address}<br />
                            {invoice.billTo.phone}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f4f7fb' }}>
                                <th style={{ padding: '15px', textAlign: 'left', borderRadius: '8px 0 0 8px', color: '#5A6A85', fontWeight: 600 }}>Mahsulot nomi</th>
                                <th style={{ padding: '15px', textAlign: 'left', color: '#5A6A85', fontWeight: 600 }}>Narxi</th>
                                <th style={{ padding: '15px', textAlign: 'left', color: '#5A6A85', fontWeight: 600 }}>Dona</th>
                                <th style={{ padding: '15px', textAlign: 'right', borderRadius: '0 8px 8px 0', color: '#5A6A85', fontWeight: 600 }}>Jami summa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '15px', color: '#2A3547' }}>{item.name}</td>
                                    <td style={{ padding: '15px', color: '#5A6A85' }}>{item.cost.toLocaleString()}</td>
                                    <td style={{ padding: '15px', color: '#5A6A85' }}>{item.qty}</td>
                                    <td style={{ padding: '15px', textAlign: 'right', fontWeight: 600, color: '#2A3547' }}>{(item.cost * item.qty).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#5A6A85' }}>
                            <span>Jami summa:</span>
                            <span>{invoice.subTotal.toLocaleString()} so'm</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#5A6A85' }}>
                            <span>QQS (0%):</span>
                            <span>{invoice.vat.toLocaleString()} so'm</span>
                        </div>
                        <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#2A3547' }}>
                            <span>Umumiy summa:</span>
                            <span>{invoice.grandTotal.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '40px 0' }} className="no-print" />

                <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                    <button onClick={handlePrint} style={{ background: '#0085db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Printer size={18} /> Chop etish
                    </button>
                    <button onClick={handlePrint} style={{ background: '#ecf2ff', color: '#0085db', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={18} /> Yuklab olish
                    </button>
                </div>
            </div>
        </div>
    );
}
