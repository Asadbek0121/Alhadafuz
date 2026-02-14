
"use client";

import { useState } from "react";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AutoDispatchButton({ orderId, currentStatus }: { orderId: string, currentStatus: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAutoDispatch = async () => {
        if (currentStatus !== 'CREATED' && currentStatus !== 'PENDING' && currentStatus !== 'PROCESSING') {
            toast.error("Ushbu holatdagi buyurtmani avtomatik biriktirib bo'lmaydi.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/orders/auto-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(`${data.courierName} muvaffaqiyatli biriktirildi!`, {
                    description: "Kuryerga bot orqali xabar yuborildi.",
                    icon: <CheckCircle2 className="text-emerald-500" />
                });
                router.refresh();
            } else {
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Tarmoq xatoligi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleAutoDispatch}
            disabled={loading}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 group relative"
            title="Smart Auto-Dispatch"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}

            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 shadow-xl">
                Smart Dispatch
            </span>
        </button>
    );
}
