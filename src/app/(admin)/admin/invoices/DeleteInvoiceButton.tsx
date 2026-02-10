"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DeleteInvoiceButton({ id }: { id: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Haqiqatan ham ushbu invoysni o'chirmoqchimisiz? Ushbu amalni qaytarib bo'lmaydi.")) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error("O'chirishda xatolik");

            toast.success("Invoys o'chirildi");
            router.refresh();
        } catch (error) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </Button>
    );
}
