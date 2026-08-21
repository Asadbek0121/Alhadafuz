"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, ChevronLeft, Trash2, Edit2, Settings2, Check, Boxes, Layers } from "lucide-react";
import { parseOptions } from "@/lib/universal-product";
import type { AttributeDef } from "@/components/admin/product/types";
import DefinitionForm from "./DefinitionForm";

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
    TEXT: { label: "Matn", cls: "bg-gray-100 text-gray-700 border-gray-200" },
    NUMBER: { label: "Raqam", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    BOOLEAN: { label: "Ha/Yo'q", cls: "bg-purple-100 text-purple-700 border-purple-200" },
    SELECT: { label: "Tanlov", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    MULTI_SELECT: { label: "Ko'p tanlov", cls: "bg-teal-100 text-teal-700 border-teal-200" },
    COLOR: { label: "Rang", cls: "bg-pink-100 text-pink-700 border-pink-200" },
    MEASUREMENT: { label: "O'lchov", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    DATE: { label: "Sana", cls: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

function DefinitionBadge({ type }: { type: string }) {
    const meta = TYPE_BADGES[type] || { label: type, cls: "bg-gray-100 text-gray-600 border-gray-200" };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${meta.cls}`}>
            {meta.label} · {type}
        </span>
    );
}

function definitionMeta(def: AttributeDef): string {
    const parts: string[] = [];
    if ((def.type === "SELECT" || def.type === "MULTI_SELECT" || def.type === "COLOR") && def.options) {
        const opts = parseOptions(def.options);
        parts.push(opts.length > 0 ? opts.join(", ") : "options yo'q");
    }
    if (def.type === "MEASUREMENT" && def.unit) parts.push(`unit: ${def.unit}`);
    if (def.type === "NUMBER") {
        if (def.minValue != null) parts.push(`min ${def.minValue}`);
        if (def.maxValue != null) parts.push(`max ${def.maxValue}`);
    }
    return parts.join(" · ");
}

export default function CategoryAttributesPage() {
    const { id } = useParams<{ id: string }>();
    const categoryId = id as string;

    const [defs, setDefs] = useState<AttributeDef[]>([]);
    const [categoryName, setCategoryName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [createForVariant, setCreateForVariant] = useState<boolean | null>(null);
    const [editing, setEditing] = useState<AttributeDef | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const loadDefs = useCallback(async () => {
        if (!categoryId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/categories/${categoryId}/attributes`, { cache: "no-store" });
            if (!res.ok) throw new Error(`Server xatosi (${res.status})`);
            const data = await res.json();
            setDefs(Array.isArray(data.definitions) ? data.definitions : []);
        } catch (e: any) {
            toast.error(e.message || "Xususiyatlar yuklanmadi");
            setDefs([]);
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    const loadCategoryName = useCallback(async () => {
        if (!categoryId) return;
        try {
            const res = await fetch("/api/admin/categories", { cache: "no-store" });
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) {
                    const cat = list.find((c: any) => c.id === categoryId);
                    if (cat) setCategoryName(cat.name);
                }
            }
        } catch {
            /* kategoriya nomini olish ixtiyoriy */
        }
    }, [categoryId]);

    useEffect(() => {
        void loadDefs();
        void loadCategoryName();
    }, [loadDefs, loadCategoryName]);

    const handleDelete = async (def: AttributeDef) => {
        if (!confirm(`"${def.label}" xususiyatini o'chirasizmi?\n\nBu xususiyatga yozilgan product qiymatlari ham o'chadi.`)) return;
        setDeleting(def.id);
        try {
            const res = await fetch(`/api/admin/categories/${categoryId}/attributes/${def.id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Xususiyat o'chirildi");
                setDefs((prev) => prev.filter((d) => d.id !== def.id));
                if (editing?.id === def.id) setEditing(null);
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "O'chirishda xatolik");
            }
        } catch {
            toast.error("Tarmoq xatosi");
        } finally {
            setDeleting(null);
        }
    };

    const nextOrder = defs.length > 0 ? Math.max(...defs.map((d) => d.order)) + 1 : 0;

    const sortedDefs = [...defs].sort((a, b) => a.order - b.order);
    const properties = sortedDefs.filter((d) => !d.forVariant);
    const variants = sortedDefs.filter((d) => d.forVariant);

    const formOpen = createForVariant !== null || !!editing;

    const renderList = (title: string, icon: React.ReactNode, items: AttributeDef[]) => (
        <div className="bg-white rounded-xl border border-[#e5eaef] shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#eef1f5] flex items-center gap-2 text-xs font-bold text-[#7c8fac] uppercase tracking-wider">
                {icon}
                {title}
                <span className="ml-auto normal-case tracking-normal bg-[#f0f2f5] text-[#7c8fac] px-2 py-0.5 rounded-full text-[11px] font-bold">
                    {items.length}
                </span>
            </div>
            {items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                    <p className="text-sm text-[#9aa8bb]">
                        {title.includes("Xususiyat") ? "Hozircha xususiyat qo'shilmagan." : "Hozircha variant qo'shilmagan."}
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-[#f0f2f5]">
                    {items.map((def) => {
                        const meta = definitionMeta(def);
                        const isEditingThis = editing?.id === def.id;
                        return (
                            <li key={def.id} className={`px-5 py-4 flex items-start justify-between gap-4 transition-colors ${isEditingThis ? "bg-[#f4f9ff]" : "hover:bg-[#fafbfc]"}`}>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-[#2A3547] text-sm">{def.label}</span>
                                        {def.required && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fdede8] text-[#a33a20] text-[11px] font-bold border border-[#f7c8bb]">
                                                To'ldirish shart
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <DefinitionBadge type={def.type} />
                                        <code className="text-xs text-[#7c8fac] bg-[#f0f2f5] px-1.5 py-0.5 rounded font-mono">{def.name}</code>
                                        <span className="text-xs text-[#9aa8bb]">tartib {def.order}</span>
                                    </div>
                                    {meta && <p className="text-xs text-[#7c8fac] mt-1.5">{meta}</p>}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => { setEditing(def); setCreateForVariant(null); }}
                                        className="p-2 rounded-lg text-[#0085db] hover:bg-[#ecf2ff] transition-colors"
                                        title="Tahrirlash"
                                        aria-label={`${def.label} ni tahrirlash`}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(def)}
                                        disabled={deleting === def.id}
                                        className="p-2 rounded-lg text-[#fa896b] hover:bg-[#fdede8] transition-colors disabled:opacity-50"
                                        title="O'chirish"
                                        aria-label={`${def.label} ni o'chirish`}
                                    >
                                        {deleting === def.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );

    return (
        <div className="max-w-4xl">
            <Link href="/admin/categories" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5A6A85] hover:text-[#0085db] transition-colors no-underline">
                <ChevronLeft size={16} /> Kategoriyalar
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-3 mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#2A3547] flex items-center gap-2">
                        <Settings2 size={22} className="text-[#0085db]" />
                        {categoryName ? `${categoryName} — mahsulot xususiyatlari` : "Kategoriya uchun mahsulot xususiyatlari"}
                    </h1>
                    <p className="text-sm text-[#7c8fac] mt-1">
                        Bu kategoriyadagi mahsulotlar qanday xususiyat va variantlar bilan tavsiflanishini belgilang.
                        {defs.length > 0 && ` Jami: ${defs.length} ta.`}
                    </p>
                </div>
                {!formOpen && (
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button
                            onClick={() => { setCreateForVariant(false); setEditing(null); }}
                            className="inline-flex items-center justify-center gap-2 bg-[#0085db] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[#0072bd] shadow-sm"
                        >
                            <Plus size={16} /> Xususiyat qo'shish
                        </button>
                        <button
                            onClick={() => { setCreateForVariant(true); setEditing(null); }}
                            className="inline-flex items-center justify-center gap-2 bg-white text-[#0085db] border border-[#0085db] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[#ecf2ff] shadow-sm"
                        >
                            <Layers size={16} /> Variant qo'shish
                        </button>
                    </div>
                )}
            </div>

            {formOpen && (
                <div className="bg-white rounded-xl border border-[#e5eaef] p-6 mb-6 shadow-sm">
                    <h2 className="text-base font-bold text-[#2A3547] mb-5">
                        {editing ? `"${editing.label}" ni tahrirlash` : (createForVariant ? "Yangi variant qo'shish" : "Yangi xususiyat qo'shish")}
                    </h2>
                    <DefinitionForm
                        categoryId={categoryId}
                        initial={editing}
                        presetForVariant={createForVariant === true}
                        defaultOrder={nextOrder}
                        onSaved={(saved) => {
                            setDefs((prev) => {
                                const exists = prev.some((d) => d.id === saved.id);
                                return exists ? prev.map((d) => (d.id === saved.id ? saved : d)) : [...prev, saved];
                            });
                            setCreateForVariant(null);
                            setEditing(null);
                        }}
                        onCancel={() => {
                            setCreateForVariant(null);
                            setEditing(null);
                        }}
                    />
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-xl border border-[#e5eaef] shadow-sm">
                    <Loader2 size={28} className="animate-spin text-[#0085db]" />
                    <p className="text-sm font-semibold text-[#7c8fac]">Yuklanmoqda...</p>
                </div>
            ) : sortedDefs.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#e5eaef] shadow-sm text-center py-20">
                    <div className="w-16 h-16 bg-[#f0f2f5] rounded-full flex items-center justify-center mx-auto mb-4 text-[#9aa8bb]">
                        <Settings2 size={28} />
                    </div>
                    <p className="text-base font-bold text-[#2A3547]">Xususiyatlar aniqlanmagan</p>
                    <p className="text-sm text-[#9aa8bb] mt-1 max-w-sm mx-auto">
                        "Xususiyat qo'shish" yoki "Variant qo'shish" tugmasi orqali birinchi definitionni yarating.
                        Shundan keyin Product yaratish sahifasida bu kategoriya tanlanganda shu maydonlar chiqadi.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {renderList("Xususiyatlar", <Boxes size={14} className="text-[#0085db]" />, properties)}
                    {renderList("Variantlar", <Layers size={14} className="text-[#0085db]" />, variants)}
                </div>
            )}

            <p className="text-xs text-[#9aa8bb] mt-4 flex items-start gap-1.5">
                <Check size={14} className="mt-0.5 shrink-0 text-[#00ceb6]" />
                Izoh: "Xaridor tanlaydigan variant" belgilangan definitionlar Product Builder'da variant o'qlari sifatida chiqadi.
                O'chirilgan definitionga bog'langan product qiymatlari ham o'chadi (cascade).
            </p>
        </div>
    );
}
