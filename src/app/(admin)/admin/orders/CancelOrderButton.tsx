"use client";

import { useState } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function CancelOrderButton({ orderId, status }: { orderId: string, status: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (status === 'CANCELLED' || status === 'DELIVERED') return null;

    async function handleCancel() {
        if (!confirm("Haqiqatan ham bu buyurtmani bekor qilmoqchimisiz?")) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
                method: "POST",
            });

            if (!res.ok) throw new Error("Failed");

            toast.success("Buyurtma bekor qilindi");
            router.refresh();
        } catch (error) {
            toast.error("Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={loading}
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
            title="Bekor qilish"
        >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
        </Button>
    );
}
