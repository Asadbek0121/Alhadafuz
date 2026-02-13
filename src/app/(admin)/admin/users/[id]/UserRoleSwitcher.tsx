
"use client";

import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UserRoleSwitcher({ userId, currentRole }: { userId: string, currentRole: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRoleChange = async (newRole: string) => {
        if (newRole === currentRole) return;

        if (!confirm(`Foydalanuvchi rolini ${newRole} ga o'zgartirmoqchimisiz?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                toast.success("Rol muvaffaqiyatli o'zgartirildi");
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
                disabled={loading}
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    outline: 'none'
                }}
            >
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="VENDOR">VENDOR (Sotuvchi)</option>
            </select>
            {loading && <Loader2 size={16} className="animate-spin text-blue-600" />}
        </div>
    );
}
