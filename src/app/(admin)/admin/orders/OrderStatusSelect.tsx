
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";

const ORDER_STATUSES = [
    { value: "PENDING", label: "Kutilmoqda", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
    { value: "PROCESSING", label: "Jarayonda", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { value: "SHIPPING", label: "Yetkazilmoqda", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { value: "DELIVERED", label: "Yetkazildi", color: "text-green-600 bg-green-50 border-green-200" },
    { value: "CANCELLED", label: "Bekor qilindi", color: "text-red-600 bg-red-50 border-red-200" },
];

export default function OrderStatusSelect({
    orderId,
    currentStatus
}: {
    orderId: string;
    currentStatus: string;
}) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleStatusChange(newStatus: string) {
        setLoading(true);
        setStatus(newStatus); // Optimistic update

        try {
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed");

            toast.success("Buyurtma holati o'zgartirildi");
            router.refresh();
        } catch (error) {
            toast.error("Xatolik yuz berdi");
            setStatus(currentStatus); // Revert on error
        } finally {
            setLoading(false);
        }
    }

    const currentStatusObj = ORDER_STATUSES.find(s => s.value === status) || { color: 'text-gray-600 bg-gray-50 border-gray-200', label: status };

    return (
        <div className="relative inline-block">
            <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={loading}
                className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-semibold border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all ${currentStatusObj.color}`}
            >
                {ORDER_STATUSES.map((option) => (
                    <option key={option.value} value={option.value} className="bg-white text-gray-900">
                        {option.label}
                    </option>
                ))}
            </select>
            <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${loading ? 'animate-spin' : ''}`}>
                {loading ? (
                    <Loader2 size={12} className="opacity-50" />
                ) : (
                    <ChevronDown size={12} className="opacity-50" />
                )}
            </div>
        </div>
    );
}
