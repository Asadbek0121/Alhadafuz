"use client";


import { useState } from "react";
import { Plus, X, Loader2, User, Mail, Lock, Phone } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateUserModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        username: "",
        password: "",
        role: "VENDOR"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Foydalanuvchi muvaffaqiyatli qo'shildi");
                setIsOpen(false);
                setFormData({ name: "", email: "", phone: "", username: "", password: "", role: "VENDOR" });
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Server bilan bog'lanishda xatolik");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
            >
                <Plus size={18} /> Sotuvchi Qo'shish
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-base font-black text-gray-900">Yangi Foydalanuvchi</h2>
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Yopish"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="user-name" className="text-xs font-bold text-gray-700 ml-0.5">To'liq ism</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                        <input
                                            id="user-name"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                            placeholder="Ali Valiyev"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="user-phone" className="text-xs font-bold text-gray-700 ml-0.5">Telefon</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                        <input
                                            id="user-phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                            placeholder="+998 90 123 45 67"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="user-email" className="text-xs font-bold text-gray-700 ml-0.5">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                    <input
                                        id="user-email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                        placeholder="ali@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label htmlFor="user-username" className="text-xs font-bold text-gray-700 ml-0.5">Login</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                        <input
                                            id="user-username"
                                            required
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                            placeholder="alixon"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="user-password" className="text-xs font-bold text-gray-700 ml-0.5">Parol</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                        <input
                                            id="user-password"
                                            type="password"
                                            required
                                            minLength={6}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                            placeholder="••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="user-role" className="text-xs font-bold text-gray-700 ml-0.5">Rol</label>
                                <select
                                    id="user-role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium text-sm"
                                >
                                    <option value="VENDOR">SOTUVCHI (VENDOR)</option>
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="USER">ODDIY USER</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                {loading ? "Qo'shilmoqda..." : "Saqlash"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}