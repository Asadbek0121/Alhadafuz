
"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Check, X, Trash2, Loader2, MessageSquare } from 'lucide-react';
import Image from 'next/image';

interface Review {
    id: string;
    rating: number;
    comment: string;
    status: string;
    createdAt: string;
    user: { name: string; image: string };
    product: { title: string; image: string };
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await fetch('/api/admin/reviews');
            if (res.ok) {
                const data = await res.json();
                setReviews(data);
            }
        } catch (e) {
            toast.error("Sharhlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(`Sharh ${status === 'APPROVED' ? 'tasdiqlandi' : 'rad etildi'}`);
                fetchReviews();
            }
        } catch (e) {
            toast.error("Xatolik");
        }
    };

    const deleteReview = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Sharh o'chirildi");
                setReviews(reviews.filter(r => r.id !== id));
            }
        } catch (e) { }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Sharhlar Moderatsiyasi</h1>

            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eee', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                <th style={{ padding: '12px 24px', color: '#666', fontSize: '14px' }}>Mahsulot</th>
                                <th style={{ padding: '12px 24px', color: '#666', fontSize: '14px' }}>Foydalanuvchi</th>
                                <th style={{ padding: '12px 24px', color: '#666', fontSize: '14px' }}>Sharh</th>
                                <th style={{ padding: '12px 24px', color: '#666', fontSize: '14px' }}>Reyting</th>
                                <th style={{ padding: '12px 24px', color: '#666', fontSize: '14px' }}>Status</th>
                                <th style={{ padding: '12px 24px', color: '#666', fontSize: '14px' }}>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map(review => (
                                <tr key={review.id} style={{ borderTop: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '40px', height: '40px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                                                {review.product?.image ? <img src={review.product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                                            </div>
                                            <span style={{ fontSize: '13px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{review.product?.title}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                                        {review.user?.name || 'Anonim'}
                                    </td>
                                    <td style={{ padding: '12px 24px', fontSize: '13px', maxWidth: '200px' }}>
                                        {review.comment}
                                    </td>
                                    <td style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
                                        {review.rating} ★
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                            background: review.status === 'APPROVED' ? '#dcfce7' : review.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                                            color: review.status === 'APPROVED' ? '#16a34a' : review.status === 'PENDING' ? '#d97706' : '#ef4444'
                                        }}>
                                            {review.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {review.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => updateStatus(review.id, 'APPROVED')} title="Tasdiqlash" style={{ padding: '6px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Check size={16} /></button>
                                                    <button onClick={() => updateStatus(review.id, 'REJECTED')} title="Rad etish" style={{ padding: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><X size={16} /></button>
                                                </>
                                            )}
                                            <button onClick={() => deleteReview(review.id)} title="O'chirish" style={{ padding: '6px', background: '#f3f4f6', color: '#666', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reviews.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Sharhlar mavjud emas</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
