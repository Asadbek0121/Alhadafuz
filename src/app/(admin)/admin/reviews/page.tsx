"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Check, X, Star, Trash2, MessageCircle, Save } from 'lucide-react';

interface Review {
    id: string;
    rating: number;
    comment: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    adminReply?: string;
    user: { name: string; email: string };
    product: { title: string; image: string };
}

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    const fetchReviews = async () => {
        try {
            const res = await fetch('/api/admin/reviews');
            if (res.ok) {
                const data = await res.json();
                setReviews(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Fetch reviews error:", error);
            toast.error("Sharhlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleStatusChange = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success(`Sharh ${status === 'APPROVED' ? 'tasdiqlandi' : 'rad etildi'}`);
                fetchReviews(); // Refresh list
            } else {
                toast.error("Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Sharh o'chirildi");
                setReviews(reviews.filter(r => r.id !== id));
            } else {
                toast.error("O'chirishda xatolik");
            }
        } catch (error) {
            toast.error("Xatolik");
        }
    };

    const handleReplySubmit = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/reviews/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminReply: replyText })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Javob saqlandi");
                setReplyingId(null);
                fetchReviews();
            } else {
                toast.error(data.details || "Saqlashda xatolik");
            }
        } catch (error) {
            toast.error("Xatolik yuz berdi");
        }
    };

    if (loading) return <div className="p-8">Yuklanmoqda...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Sharhlarni Boshqarish</h1>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Foydalanuvchi</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mahsulot</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Baho & Izoh</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Holat</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {reviews.map((review) => (
                            <tr key={review.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{review.user?.name || "Noma'lum"}</div>
                                    <div className="text-sm text-gray-500">{review.user?.email}</div>
                                    <div className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                                            {review.product?.image && <img src={review.product.image} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="text-sm font-medium text-gray-900 line-clamp-2 w-48" title={review.product?.title}>{review.product?.title}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex text-yellow-400 mb-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={i < review.rating ? 0 : 1} className={i < review.rating ? "" : "text-gray-300"} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-3">{review.comment}</p>

                                    {review.adminReply && replyingId !== review.id && (
                                        <div className="mt-2 p-2 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
                                            <strong>Admin javobi:</strong> {review.adminReply}
                                        </div>
                                    )}

                                    {replyingId === review.id && (
                                        <div className="mt-2 flex gap-2">
                                            <textarea
                                                className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                rows={2}
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Javob yozing..."
                                            />
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => handleReplySubmit(review.id)} className="p-1 text-white bg-blue-600 rounded hover:bg-blue-700">
                                                    <Save size={16} />
                                                </button>
                                                <button onClick={() => setReplyingId(null)} className="p-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${review.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                        review.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {review.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setReplyingId(review.id);
                                                setReplyText(review.adminReply || "");
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Javob berish"
                                        >
                                            <MessageCircle size={18} />
                                        </button>
                                        {review.status !== 'APPROVED' && (
                                            <button onClick={() => handleStatusChange(review.id, 'APPROVED')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Tasdiqlash">
                                                <Check size={18} />
                                            </button>
                                        )}
                                        {review.status !== 'REJECTED' && (
                                            <button onClick={() => handleStatusChange(review.id, 'REJECTED')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Rad etish">
                                                <X size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => handleDelete(review.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg" title="O'chirish">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {reviews.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    Sharhlar topilmadi
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
