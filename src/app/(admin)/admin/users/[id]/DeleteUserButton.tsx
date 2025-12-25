
"use client";

import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DeleteUserButton({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Haqiqatan ham bu foydalanuvchini va unga tegishli barcha ma'lumotlarni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("Foydalanuvchi muvaffaqiyatli o'chirildi");
                router.push("/admin/users");
                router.refresh();
            } else {
                toast.error("O'chirishda xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: '#fee2e2', color: '#ef4444',
                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                opacity: loading ? 0.7 : 1
            }}
        >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
            {loading ? "O'chirilmoqda..." : "Hisobni O'chirish"}
        </button>
    );
}
