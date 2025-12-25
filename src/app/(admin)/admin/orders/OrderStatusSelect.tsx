
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ORDER_STATUSES = [
    { value: "PENDING", label: "Kutilmoqda", color: "#f59e0b" },
    { value: "PROCESSING", label: "Jarayonda", color: "#3b82f6" },
    { value: "SHIPPING", label: "Yetkazilmoqda", color: "#8b5cf6" },
    { value: "DELIVERED", label: "Yetkazildi", color: "#22c55e" },
    { value: "CANCELLED", label: "Bekor qilindi", color: "#ef4444" },
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

    const currentStatusObj = ORDER_STATUSES.find(s => s.value === status) || { color: '#666', label: status };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={loading}
                style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${currentStatusObj.color}`,
                    color: currentStatusObj.color,
                    background: "#fff",
                    fontWeight: "500",
                    fontSize: "13px",
                    cursor: "pointer",
                    outline: "none",
                    minWidth: "120px"
                }}
            >
                {ORDER_STATUSES.map((option) => (
                    <option key={option.value} value={option.value} style={{ color: '#000' }}>
                        {option.label}
                    </option>
                ))}
            </select>
            {loading && (
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    <Loader2 className="animate-spin" size={14} color={currentStatusObj.color} />
                </div>
            )}
        </div>
    );
}
