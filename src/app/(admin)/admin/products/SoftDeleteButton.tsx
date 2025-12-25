
"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SoftDeleteButton({ productId }: { productId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        if (!confirm("Haqiqatan ham bu mahsulotni o'chirmoqchimisiz?")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/products/${productId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed");

            toast.success("Mahsulot o'chirildi");
            router.refresh();
        } catch (error) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            style={{ padding: "8px", borderRadius: "6px", background: "#fee2e2", border: "none", color: "#ef4444", cursor: "pointer", opacity: loading ? 0.7 : 1 }}
        >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
        </button>
    );
}
