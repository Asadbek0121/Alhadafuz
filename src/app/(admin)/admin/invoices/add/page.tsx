"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Printer, Download, Save, Send } from "lucide-react";

export default function AddInvoicePage() {
    const router = useRouter();
    const [status, setStatus] = useState("Pending");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState("");

    // Billing Info
    const [billFrom, setBillFrom] = useState({ name: "UzMarket", address: "Tashkent, Uzbekistan", email: "info@uzmarket.uz", phone: "+998 90 123 45 67" });
    const [billTo, setBillTo] = useState({ name: "", address: "", email: "", phone: "" });

    // Items
    const [items, setItems] = useState([
        { id: 1, name: "", cost: 0, qty: 1 }
    ]);

    // Metadata
    const [subTotal, setSubTotal] = useState(0);
    const [vat, setVat] = useState(10); // 10% VAT
    const [grandTotal, setGrandTotal] = useState(0);

    // Calc totals effect
    useEffect(() => {
        const sub = items.reduce((acc, item) => acc + (item.cost * item.qty), 0);
        setSubTotal(sub);
        setGrandTotal(sub + (sub * vat / 100));
    }, [items, vat]);

    const addItem = () => {
        setItems([...items, { id: Date.now(), name: "", cost: 0, qty: 1 }]);
    };

    const removeItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id: number, field: string, value: any) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setItems(newItems);
    };

    const handleSave = () => {
        // Here you would save to DB, for now simulating
        alert("Invoys saqlandi!");
        router.push("/admin/invoices");
    };

    return (
        <div style={{ padding: "0" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Invoys Qo'shish</h1>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', padding: '30px', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Order Status:</h2>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                        >
                            <option value="Pending">Kutilmoqda (Pending)</option>
                            <option value="Shipped">Yuborilgan (Shipped)</option>
                            <option value="Delivered">Yetkazilgan (Delivered)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Order Date:</h2>
                        <input
                            type="date"
                            value={issueDate}
                            onChange={e => setIssueDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                        />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                {/* Addresses Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px', marginBottom: '30px' }}>

                    {/* Bill From */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Bill From</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                value={billFrom.name}
                                onChange={e => setBillFrom({ ...billFrom, name: e.target.value })}
                                placeholder="Bill From Name"
                                style={styles.input}
                            />
                            <textarea
                                value={billFrom.address}
                                onChange={e => setBillFrom({ ...billFrom, address: e.target.value })}
                                placeholder="Bill From Address"
                                style={styles.input}
                                rows={2}
                            />
                            <input
                                value={billFrom.email}
                                onChange={e => setBillFrom({ ...billFrom, email: e.target.value })}
                                placeholder="Bill From Email"
                                style={styles.input}
                            />
                            <input
                                value={billFrom.phone}
                                onChange={e => setBillFrom({ ...billFrom, phone: e.target.value })}
                                placeholder="Bill From Phone"
                                style={styles.input}
                            />
                        </div>
                    </div>

                    {/* Bill To */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Bill To</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                value={billTo.name}
                                onChange={e => setBillTo({ ...billTo, name: e.target.value })}
                                placeholder="Mijoz ismi (Bill To Name)"
                                style={styles.input}
                            />
                            <textarea
                                value={billTo.address}
                                onChange={e => setBillTo({ ...billTo, address: e.target.value })}
                                placeholder="Mijoz manzili (Bill To Address)"
                                style={styles.input}
                                rows={2}
                            />
                            <input
                                value={billTo.email}
                                onChange={e => setBillTo({ ...billTo, email: e.target.value })}
                                placeholder="Bill To Email"
                                style={styles.input}
                            />
                            <input
                                value={billTo.phone}
                                onChange={e => setBillTo({ ...billTo, phone: e.target.value })}
                                placeholder="Bill To Phone"
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                {/* Items Table */}
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                <th style={styles.th}>#</th>
                                <th style={styles.th}>Item Name</th>
                                <th style={styles.th}>Unit Cost</th>
                                <th style={styles.th}>Unit</th>
                                <th style={styles.th}>Total</th>
                                <th style={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={styles.td}>{index + 1}</td>
                                    <td style={styles.td}>
                                        <input
                                            value={item.name}
                                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                                            placeholder="Item Name"
                                            style={styles.tableInput}
                                        />
                                    </td>
                                    <td style={styles.td}>
                                        <input
                                            type="number"
                                            value={item.cost}
                                            onChange={e => updateItem(item.id, 'cost', Number(e.target.value))}
                                            placeholder="Cost"
                                            style={styles.tableInput}
                                        />
                                    </td>
                                    <td style={styles.td}>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                                            placeholder="Qty"
                                            style={styles.tableInput}
                                        />
                                    </td>
                                    <td style={styles.td}>
                                        {(item.cost * item.qty).toLocaleString()} so'm
                                    </td>
                                    <td style={styles.td}>
                                        <button onClick={() => removeItem(item.id)} style={{ color: '#fa896b', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addItem} style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '5px', background: '#ecf2ff', color: '#0085db', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                {/* Footer Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '300px' }}>
                        <div style={styles.totalRow}>
                            <span>Sub Total:</span>
                            <span>{subTotal.toLocaleString()} so'm</span>
                        </div>
                        <div style={styles.totalRow}>
                            <span>Vat (10%):</span>
                            <span>{(subTotal * 0.1).toLocaleString()} so'm</span>
                        </div>
                        <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />
                        <div style={{ ...styles.totalRow, fontSize: '18px', fontWeight: 'bold' }}>
                            <span>Grand Total:</span>
                            <span>{grandTotal.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                    <button onClick={handleSave} style={{ background: '#0085db', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} /> Save Invoice
                    </button>
                    <button onClick={() => router.back()} style={{ background: '#fa896b', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                </div>

            </div>
        </div>
    );
}

const styles = {
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '6px',
        border: '1px solid #e5eaef',
        outline: 'none',
        fontSize: '14px',
        color: '#5A6A85'
    },
    th: {
        textAlign: 'left' as const,
        padding: '12px',
        color: '#5A6A85',
        fontSize: '14px',
        fontWeight: 600
    },
    td: {
        padding: '12px',
        color: '#2A3547',
        fontSize: '14px'
    },
    tableInput: {
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #eee',
        outline: 'none',
        fontSize: '14px'
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '14px',
        color: '#5A6A85'
    }
};
