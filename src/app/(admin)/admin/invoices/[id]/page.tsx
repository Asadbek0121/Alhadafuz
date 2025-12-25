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
        vat: 1230000,
        grandTotal: 13530000
    };

    return (
        <div style={{ padding: "0" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Invoice #{invoice.id}</h1>
                    <span style={{ background: '#e6fffa', color: '#00ceb6', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{invoice.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => router.push(`/admin/invoices/${id}/edit`)} style={{ background: '#ecf2ff', color: '#0085db', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Edit Invoice
                    </button>
                    <button onClick={() => router.back()} style={{ background: '#fa896b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>

                {/* Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                    <div>
                        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>Order Date:</span>
                        <span style={{ fontWeight: 600, color: '#2A3547' }}>{invoice.date}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '5px' }}>Order Status:</span>
                        <span style={{ fontWeight: 600, color: '#2A3547' }}>{invoice.status}</span>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '40px' }} />

                {/* Addresses */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', marginBottom: '40px' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '15px', color: '#2A3547', fontSize: '16px' }}>Bill From</h4>
                        <div style={{ fontSize: '14px', color: '#5A6A85', lineHeight: '1.6' }}>
                            <strong style={{ color: '#2A3547' }}>{invoice.billFrom.name}</strong><br />
                            {invoice.billFrom.email}<br />
                            {invoice.billFrom.address}<br />
                            {invoice.billFrom.phone}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: '15px', color: '#2A3547', fontSize: '16px' }}>Bill To</h4>
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
                                <th style={{ padding: '15px', textAlign: 'left', borderRadius: '8px 0 0 8px', color: '#5A6A85', fontWeight: 600 }}>Item Name</th>
                                <th style={{ padding: '15px', textAlign: 'left', color: '#5A6A85', fontWeight: 600 }}>Unit Cost</th>
                                <th style={{ padding: '15px', textAlign: 'left', color: '#5A6A85', fontWeight: 600 }}>Unit</th>
                                <th style={{ padding: '15px', textAlign: 'right', borderRadius: '0 8px 8px 0', color: '#5A6A85', fontWeight: 600 }}>Total Cost</th>
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
                            <span>Sub Total:</span>
                            <span>{invoice.subTotal.toLocaleString()} so'm</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#5A6A85' }}>
                            <span>Vat (10%):</span>
                            <span>{invoice.vat.toLocaleString()} so'm</span>
                        </div>
                        <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#2A3547' }}>
                            <span>Grand Total:</span>
                            <span>{invoice.grandTotal.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '40px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                    <button style={{ background: '#0085db', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Printer size={18} /> Print Invoice
                    </button>
                    <button style={{ background: '#ecf2ff', color: '#0085db', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={18} /> Download
                    </button>
                </div>
            </div>
        </div>
    );
}
