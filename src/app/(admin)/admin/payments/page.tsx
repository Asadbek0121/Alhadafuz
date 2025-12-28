
"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, CreditCard, Save, X, Settings, List } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface PaymentMethod {
    id: string;
    name: string;
    type: string;
    provider: string;
    details?: string;
    config?: string;
    isActive: boolean;
}

export default function PaymentMethodsPage() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        type: "MERCHANT",
        provider: "CLICK",
        details: "",
        config: "",
        isActive: true
    });

    // Fetch Payment Methods
    const { data: methods, isLoading } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: async () => {
            const res = await fetch('/api/admin/payment-methods');
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json() as Promise<PaymentMethod[]>;
        }
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/admin/payment-methods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("Muvaffaqiyatli qo'shildi");
            setIsModalOpen(false);
        },
        onError: (err) => {
            toast.error("Xatolik: " + err.message);
        }
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/admin/payment-methods', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("Yangilandi");
            setIsModalOpen(false);
        },
        onError: (err) => {
            toast.error("Xatolik: " + err.message);
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/admin/payment-methods?id=${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
            toast.success("O'chirildi");
        }
    });

    const handleOpenModal = (method?: PaymentMethod) => {
        if (method) {
            setEditingMethod(method);
            setFormData({
                name: method.name,
                type: method.type,
                provider: method.provider,
                details: method.details || "",
                config: method.config || "",
                isActive: method.isActive
            });
        } else {
            setEditingMethod(null);
            setFormData({ name: "", type: "MERCHANT", provider: "CLICK", details: "", config: "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            // Validatsiya
            if (!formData.name) {
                toast.error("Nom kiritilishi shart!");
                return;
            }

            console.log("Sending data:", formData);

            if (editingMethod) {
                await updateMutation.mutateAsync({ ...formData, id: editingMethod.id });
            } else {
                await createMutation.mutateAsync(formData);
            }
        } catch (e: any) {
            console.error("Save error:", e);
            // Toast will be handled by onError in mutation, but extra safety:
            // toast.error("Kutilmagan xatolik: " + e.message);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Haqiqatan ham o'chirmoqchimisiz?")) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <div>Yuklanmoqda...</div>;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>To'lov Tizimlari</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link href="/admin/payments/logs" style={{
                        color: '#64748b', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px',
                        textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', background: 'white'
                    }}>
                        <List size={18} />
                        Tarix (Logs)
                    </Link>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{
                            background: '#0085db',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        <Plus size={18} />
                        Qo'shish
                    </button>
                </div>
            </div>

            {/* List */}
            <div style={{ display: 'grid', gap: '16px' }}>
                {methods?.length === 0 && <div style={{ padding: '20px', textAlign: 'center', background: 'white', borderRadius: '12px' }}>Hozircha tizimlar yo'q</div>}

                {methods?.map((method) => (
                    <div key={method.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0085db' }}>
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{method.name}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                                    {method.provider} • {method.type}
                                </p>
                                {method.details && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#999' }}>{method.details}</p>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                background: method.isActive ? '#dcfce7' : '#f1f5f9',
                                color: method.isActive ? '#166534' : '#64748b'
                            }}>
                                {method.isActive ? 'Faol' : 'Nofaol'}
                            </span>

                            <button onClick={() => handleOpenModal(method)} style={{ padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}>
                                <Settings size={16} />
                            </button>

                            <button onClick={() => handleDelete(method.id)} style={{ padding: '8px', background: '#fff1f2', border: '1px solid #ffe4e6', borderRadius: '8px', cursor: 'pointer', color: '#e11d48' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
                                {editingMethod ? "Tahrirlash" : "Yangi qo'shish"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Nom (Foydalanuvchiga ko'rinadi)</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Masalan: Click orqali to'lash"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Tizim (Provider)</label>
                                    <select
                                        value={formData.provider}
                                        onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="CLICK">CLICK</option>
                                        <option value="PAYME">PAYME</option>
                                        <option value="UZUM">UZUM</option>
                                        <option value="CASH">NAQD PUL</option>
                                        <option value="CARD">KARTA (P2P)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Turi</label>
                                    <input
                                        type="text"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        placeholder="MERCHANT / P2P"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Qo'shimcha ma'lumot (Details)</label>
                                <input
                                    type="text"
                                    value={formData.details}
                                    onChange={e => {
                                        let val = e.target.value.replace(/\D/g, ''); // Faqat raqamlar
                                        if (formData.provider === 'CARD' || formData.type === 'P2P') {
                                            if (val.length > 16) val = val.slice(0, 16); // 16 ta raqam bilan cheklash
                                        }
                                        setFormData({ ...formData, details: val });
                                    }}
                                    placeholder={formData.provider === 'CARD' ? "8600 0000 0000 0000" : "Qo'shimcha ma'lumot"}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                {(formData.provider === 'CARD' || formData.type === 'P2P') && (
                                    <p style={{ fontSize: '11px', color: formData.details?.length === 16 ? 'green' : 'red', marginTop: '4px' }}>
                                        {formData.details?.length || 0}/16 raqam
                                    </p>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Maxfiy Sozlamalar (JSON Config)</label>
                                <textarea
                                    value={formData.config}
                                    onChange={e => setFormData({ ...formData, config: e.target.value })}
                                    placeholder='{"service_id": "...", "merchant_id": "..."}'
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px', fontFamily: 'monospace', fontSize: '12px' }}
                                />
                                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Agar API orqali bo'lsa Merchant ID va Service ID kiritishingiz mumkin.</p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <label htmlFor="isActive" style={{ fontSize: '14px' }}>Faol qilish</label>
                            </div>

                            <button
                                onClick={() => handleSave()}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                style={{
                                    background: '#0085db',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    marginTop: '10px',
                                    cursor: 'pointer',
                                    opacity: (createMutation.isPending || updateMutation.isPending) ? 0.7 : 1
                                }}
                            >
                                {createMutation.isPending || updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
