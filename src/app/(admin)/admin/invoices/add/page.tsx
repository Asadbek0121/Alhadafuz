"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Save } from 'lucide-react';
import styles from '../InvoiceForm.module.css';

export default function AddInvoicePage() {
    const router = useRouter();
    const [status, setStatus] = useState("Pending");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState("");

    // Billing Info
    const [billFrom, setBillFrom] = useState({ name: "Hadaf Market", address: "", email: "", phone: "" });
    const [billTo, setBillTo] = useState({ name: "", address: "", email: "", phone: "" });

    // Items
    const [items, setItems] = useState([
        { id: 1, name: "", cost: 0, qty: 1 }
    ]);

    // Metadata
    const [vat, setVat] = useState(10); // 10% VAT

    // Calc totals (derived during render)
    const subTotal = items.reduce((acc, item) => acc + (item.cost * item.qty), 0);
    const grandTotal = subTotal + (subTotal * vat / 100);

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
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Invoys Qo'shish</h1>
            </div>

            <div className={styles.card}>
                {/* Header Row */}
                <div className={styles.infoSection}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <h2 className={styles.label}>Order Status:</h2>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className={styles.select}
                            title="Invoys holati"
                        >
                            <option value="Pending">Kutilmoqda (Pending)</option>
                            <option value="Shipped">Yuborilgan (Shipped)</option>
                            <option value="Delivered">Yetkazilgan (Delivered)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <h2 className={styles.label}>Order Date:</h2>
                        <input
                            type="date"
                            value={issueDate}
                            onChange={e => setIssueDate(e.target.value)}
                            className={styles.input}
                            title="Buyurtma sanasi"
                        />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                {/* Addresses Row */}
                <div className={styles.billingSection}>
                    {/* Bill From */}
                    <div className={styles.infoCol}>
                        <h3 className={styles.billingTitle}>Bill From</h3>
                        <div className={styles.billingInputs}>
                            <input
                                value={billFrom.name}
                                onChange={e => setBillFrom({ ...billFrom, name: e.target.value })}
                                placeholder="Bill From Name"
                                className={styles.input}
                                title="Kimdan: Ism"
                            />
                            <textarea
                                value={billFrom.address}
                                onChange={e => setBillFrom({ ...billFrom, address: e.target.value })}
                                placeholder="Bill From Address"
                                className={styles.input}
                                rows={2}
                                title="Kimdan: Manzil"
                            />
                            <input
                                value={billFrom.email}
                                onChange={e => setBillFrom({ ...billFrom, email: e.target.value })}
                                placeholder="Bill From Email"
                                className={styles.input}
                                title="Kimdan: Email"
                            />
                            <input
                                value={billFrom.phone}
                                onChange={e => setBillFrom({ ...billFrom, phone: e.target.value })}
                                placeholder="Bill From Phone"
                                className={styles.input}
                                title="Kimdan: Telefon"
                            />
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className={styles.infoCol}>
                        <h3 className={styles.billingTitle}>Bill To</h3>
                        <div className={styles.billingInputs}>
                            <input
                                value={billTo.name}
                                onChange={e => setBillTo({ ...billTo, name: e.target.value })}
                                placeholder="Mijoz ismi"
                                className={styles.input}
                                title="Kimga: Ism"
                            />
                            <textarea
                                value={billTo.address}
                                onChange={e => setBillTo({ ...billTo, address: e.target.value })}
                                placeholder="Mijoz manzili"
                                className={styles.input}
                                rows={2}
                                title="Kimga: Manzil"
                            />
                            <input
                                value={billTo.email}
                                onChange={e => setBillTo({ ...billTo, email: e.target.value })}
                                placeholder="Bill To Email"
                                className={styles.input}
                                title="Kimga: Email"
                            />
                            <input
                                value={billTo.phone}
                                onChange={e => setBillTo({ ...billTo, phone: e.target.value })}
                                placeholder="Bill To Phone"
                                className={styles.input}
                                title="Kimga: Telefon"
                            />
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                {/* Items Table */}
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>#</th>
                                <th className={styles.th}>Item Name</th>
                                <th className={styles.th}>Unit Cost</th>
                                <th className={styles.th}>Unit</th>
                                <th className={styles.th}>Total</th>
                                <th className={styles.th}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td className={styles.td}>{index + 1}</td>
                                    <td className={styles.td}>
                                        <input
                                            value={item.name}
                                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                                            placeholder="Item Name"
                                            className={styles.tableInput}
                                            title="Mahsulot nomi"
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                            type="number"
                                            value={item.cost}
                                            onChange={e => updateItem(item.id, 'cost', Number(e.target.value))}
                                            placeholder="Cost"
                                            className={styles.tableInput}
                                            title="Narxi"
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                                            placeholder="Qty"
                                            className={styles.tableInput}
                                            title="Dona"
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        {(item.cost * item.qty).toLocaleString()} so'm
                                    </td>
                                    <td className={styles.td}>
                                        <button onClick={() => removeItem(item.id)} className={styles.removeButton} title="O'chirish">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addItem} className={styles.addButton} title="Yangi mahsulot qo'shish">
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                {/* Footer Totals */}
                <div className={styles.summarySection}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Sub Total:</span>
                            <span className={styles.summaryValue}>{subTotal.toLocaleString()} so'm</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Vat (10%):</span>
                            <span className={styles.summaryValue}>{(subTotal * 0.1).toLocaleString()} so'm</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>Grand Total:</span>
                            <span>{grandTotal.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />

                <div className={styles.actions}>
                    <button onClick={handleSave} className={styles.saveButton} title="Invoysni saqlash">
                        <Save size={18} /> Save Invoice
                    </button>
                    <button onClick={() => router.back()} className={styles.cancelButton} title="Bekor qilish">
                        Cancel
                    </button>
                </div>

            </div>
        </div>
    );
}
