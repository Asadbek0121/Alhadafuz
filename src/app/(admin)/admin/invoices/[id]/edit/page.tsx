"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Trash2, Plus, Save } from 'lucide-react';
import styles from '../../InvoiceForm.module.css';

export default function EditInvoicePage() {
    const { id } = useParams();
    const router = useRouter();
    const [status, setStatus] = useState("Pending");
    const [issueDate, setIssueDate] = useState("2023-11-20");
    const [billFrom, setBillFrom] = useState({ name: "Hadaf Market", address: "Termez, Surxondaryo", email: "info@hadaf.uz", phone: "+998 71 200 01 05" });
    const [billTo, setBillTo] = useState({ name: "Asadbek Davronov", address: "Tashkent, Uzbekistan", email: "asadbek2001@gmail.com", phone: "+998 93 077 01 23" });

    // Mock Items to simulate edit
    const [items, setItems] = useState([
        { id: 1, name: "iPhone 13 Pro", cost: 12000000, qty: 1 },
        { id: 2, name: "Silicone Case", cost: 150000, qty: 2 }
    ]);

    const [vat, setVat] = useState(0);

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
        alert("Invoys yangilandi!");
        router.push("/admin/invoices");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Invoys Tahrirlash #{id}</h1>
            </div>

            <div className={styles.card}>
                <div className={styles.infoSection}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <h2 className={styles.label}>Invoys holati:</h2>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className={styles.select}
                            title="Invoys holati"
                        >
                            <option value="Pending">Kutilmoqda (Pending)</option>
                            <option value="Shipped">Yuborildi (Shipped)</option>
                            <option value="Delivered">Yetkazildi (Delivered)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <h2 className={styles.label}>Buyurtma sanasi:</h2>
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

                <div className={styles.billingSection}>
                    <div className={styles.infoCol}>
                        <h3 className={styles.billingTitle}>Kimdan</h3>
                        <div className={styles.billingInputs}>
                            <input
                                value={billFrom.name}
                                onChange={e => setBillFrom({ ...billFrom, name: e.target.value })}
                                className={styles.input}
                                title="Kimdan: Ism"
                            />
                            <textarea
                                value={billFrom.address}
                                onChange={e => setBillFrom({ ...billFrom, address: e.target.value })}
                                className={styles.input}
                                rows={2}
                                title="Kimdan: Manzil"
                            />
                            <input
                                value={billFrom.email}
                                onChange={e => setBillFrom({ ...billFrom, email: e.target.value })}
                                className={styles.input}
                                title="Kimdan: Email"
                            />
                            <input
                                value={billFrom.phone}
                                onChange={e => setBillFrom({ ...billFrom, phone: e.target.value })}
                                className={styles.input}
                                title="Kimdan: Telefon"
                            />
                        </div>
                    </div>

                    <div className={styles.infoCol}>
                        <h3 className={styles.billingTitle}>Kimga</h3>
                        <div className={styles.billingInputs}>
                            <input
                                value={billTo.name}
                                onChange={e => setBillTo({ ...billTo, name: e.target.value })}
                                className={styles.input}
                                title="Kimga: Ism"
                            />
                            <textarea
                                value={billTo.address}
                                onChange={e => setBillTo({ ...billTo, address: e.target.value })}
                                className={styles.input}
                                rows={2}
                                title="Kimga: Manzil"
                            />
                            <input
                                value={billTo.email}
                                onChange={e => setBillTo({ ...billTo, email: e.target.value })}
                                className={styles.input}
                                title="Kimga: Email"
                            />
                            <input
                                value={billTo.phone}
                                onChange={e => setBillTo({ ...billTo, phone: e.target.value })}
                                className={styles.input}
                                title="Kimga: Telefon"
                            />
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>#</th>
                                <th className={styles.th}>Mahsulot nomi</th>
                                <th className={styles.th}>Narxi</th>
                                <th className={styles.th}>Dona</th>
                                <th className={styles.th}>Jami</th>
                                <th className={styles.th}>Amal</th>
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
                                            className={styles.tableInput}
                                            title="Mahsulot nomi"
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                            type="number"
                                            value={item.cost}
                                            onChange={e => updateItem(item.id, 'cost', Number(e.target.value))}
                                            className={styles.tableInput}
                                            title="Narxi"
                                        />
                                    </td>
                                    <td className={styles.td}>
                                        <input
                                            type="number"
                                            value={item.qty}
                                            onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
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
                        <Plus size={16} /> Mahsulot qo'shish
                    </button>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '30px' }} />

                <div className={styles.summarySection}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Jami summa:</span>
                            <span className={styles.summaryValue}>{subTotal.toLocaleString()} so'm</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>QQS (0%):</span>
                            <span className={styles.summaryValue}>0 so'm</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>Umumiy summa:</span>
                            <span>{grandTotal.toLocaleString()} so'm</span>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '30px 0' }} />

                <div className={styles.actions}>
                    <button onClick={handleSave} className={styles.saveButton} title="Invoysni yangilash">
                        <Save size={18} /> Invoysni yangilash
                    </button>
                    <button onClick={() => router.back()} className={styles.cancelButton} title="Bekor qilish">
                        Bekor qilish
                    </button>
                </div>
            </div>
        </div>
    );
}
