"use client";

import { useState } from "react";
import { Trash2, Loader2, Trash } from "lucide-react";
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
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-500 font-bold text-xs hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="O'chirish"
        >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} strokeWidth={2.5} />}
            <span className="sr-only">O'chirish</span>
        </button>
    );
}
