"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, X, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Brand {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    isActive: boolean;
    _count?: { products: number };
}

export default function AdminBrandsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [logo, setLogo] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/brands");
            if (res.ok) setBrands(await res.json());
        } catch { toast.error("Yuklanmadi"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async () => {
        if (!name.trim()) { toast.error("Brend nomi kiritilishi shart"); return; }
        try {
            const url = editId ? `/api/admin/brands/${editId}` : "/api/admin/brands";
            const res = await fetch(url, {
                method: editId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), logo: logo.trim() || null }),
            });
            if (res.ok) {
                toast.success(editId ? "Brend yangilandi" : "Brend yaratildi");
                setShowForm(false); setEditId(null); setName(""); setLogo("");
                fetchData();
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Xatolik");
            }
        } catch { toast.error("Xatolik"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Brendni o'chirishni tasdiqlaysizmi? Bog'langan mahsulotlar 'brandId' ni yo'qotadi.")) return;
        try {
            const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
            if (res.ok) { toast.success("O'chirildi"); fetchData(); }
            else toast.error("Xatolik");
        } catch { toast.error("Xatolik"); }
    };

    return (
        <div className="p-5 space-y-4 bg-gray-50/30 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Brendlar</h1>
                    <p className="text-gray-500 text-sm font-medium">Mahsulot brendlarini boshqarish</p>
                </div>
                <Button onClick={() => { setShowForm(true); setEditId(null); setName(""); setLogo(""); }}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4 font-black">
                    <Plus size={16} /> Yangi brend
                </Button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brend nomi</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 p-2.5 rounded-xl outline-none font-bold text-gray-900" placeholder="Samsung, Apple, Nike..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo URL (ixtiyoriy)</label>
                        <input value={logo} onChange={e => setLogo(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 p-2.5 rounded-xl outline-none font-medium text-gray-900" placeholder="https://..." />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-xl font-black">
                            {editId ? "Saqlash" : "Qo'shish"}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }} className="h-9 px-3 rounded-xl font-bold border-gray-200 text-gray-500">
                            Bekor qilish
                        </Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
            ) : brands.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                    <Tag size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-bold text-gray-400">Brendlar yo'q</p>
                    <p className="text-sm text-gray-400 mt-1">Yuqoridagi tugma orqali birinchi brendni qo'shing.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {brands.map((b) => (
                        <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                                    {b.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 text-sm truncate">{b.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">{b.slug}</p>
                                </div>
                                <div className={`ml-auto w-2 h-2 rounded-full ${b.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 font-medium">{b._count?.products || 0} ta mahsulot</span>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditId(b.id); setName(b.name); setLogo(b.logo || ""); setShowForm(true); }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Tahrirlash">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(b.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="O'chirish">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}