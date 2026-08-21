"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save } from "lucide-react";
import { ATTRIBUTE_TYPES, validateDefinitionTypeCombo } from "@/lib/universal-product";
import type { AttributeDef } from "@/components/admin/product/types";

type TypeString = (typeof ATTRIBUTE_TYPES)[number];

interface DefinitionFormProps {
    categoryId: string;
    initial?: AttributeDef | null;
    defaultOrder?: number;
    onSaved: (def: AttributeDef) => void;
    onCancel: () => void;
}

function parseNum(v: string): number | null {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg border border-[#e5eaef] outline-none text-sm text-[#2A3547] bg-white transition-colors focus:border-[#0085db] focus:ring-2 focus:ring-[#0085db]/15";
const labelClass = "block mb-1.5 text-sm font-medium text-[#2A3547]";

export default function DefinitionForm({ categoryId, initial, defaultOrder, onSaved, onCancel }: DefinitionFormProps) {
    const [name, setName] = useState(initial?.name ?? "");
    const [label, setLabel] = useState(initial?.label ?? "");
    const [type, setType] = useState<TypeString>((initial?.type as TypeString) || "TEXT");
    const [required, setRequired] = useState(initial?.required ?? false);
    const [forVariant, setForVariant] = useState(initial?.forVariant ?? false);
    const [order, setOrder] = useState(String(initial?.order ?? defaultOrder ?? 0));
    const [options, setOptions] = useState(initial?.options ?? "");
    const [unit, setUnit] = useState(initial?.unit ?? "");
    const [minValue, setMinValue] = useState(initial?.minValue != null ? String(initial.minValue) : "");
    const [maxValue, setMaxValue] = useState(initial?.maxValue != null ? String(initial.maxValue) : "");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isEdit = !!initial?.id;

    // Type'ga qarab dinamik maydonlar
    const showOptions = type === "SELECT" || type === "MULTI_SELECT" || type === "COLOR";
    const showUnit = type === "MEASUREMENT";
    const showMinMax = type === "NUMBER";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Ichki nom (name) majburiy");
            return;
        }
        if (!label.trim()) {
            setError("Label (ko'rinadigan nom) majburiy");
            return;
        }

        const payload = {
            name: name.trim(),
            label: label.trim(),
            type,
            required,
            forVariant,
            order: Math.max(0, Number(order) || 0),
            options: showOptions ? options.trim() || null : null,
            unit: showUnit ? unit.trim() || null : null,
            minValue: showMinMax ? parseNum(minValue) : null,
            maxValue: showMinMax ? parseNum(maxValue) : null,
        };

        // Backend authoritative validatsiya bilan bir xil tekshiruv frontend'da ham
        const comboErr = validateDefinitionTypeCombo(
            payload.type, payload.options, payload.unit, payload.minValue, payload.maxValue
        );
        if (comboErr) {
            setError(comboErr);
            return;
        }

        setSubmitting(true);
        try {
            const url = isEdit
                ? `/api/admin/categories/${categoryId}/attributes/${initial.id}`
                : `/api/admin/categories/${categoryId}/attributes`;
            const res = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 409) {
                    setError(data.error || "Bunday nomli xususiyat allaqachon mavjud");
                } else {
                    setError(data.error || (isEdit ? "Yangilashda xatolik" : "Yaratishda xatolik"));
                }
                return;
            }
            toast.success(isEdit ? "Xususiyat yangilandi" : "Xususiyat yaratildi");
            onSaved(data as AttributeDef);
        } catch {
            setError("Tarmoq xatosi — qayta urinib ko'ring");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                    <label htmlFor="def-name" className={labelClass}>
                        Ichki nom (name) <span className="text-[#fa896b]">*</span>
                    </label>
                    <input
                        id="def-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                        placeholder="masalan: material"
                        disabled={submitting}
                    />
                    <p className="text-xs text-[#7c8fac] mt-1">Variant o'qi va JSON kalitlarida ishlatiladi</p>
                </div>

                <div className="form-group">
                    <label htmlFor="def-label" className={labelClass}>
                        Label (ko'rinadigan nom) <span className="text-[#fa896b]">*</span>
                    </label>
                    <input
                        id="def-label"
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className={inputClass}
                        placeholder="masalan: Material"
                        disabled={submitting}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="def-type" className={labelClass}>
                        Tip <span className="text-[#fa896b]">*</span>
                    </label>
                    <select
                        id="def-type"
                        value={type}
                        onChange={(e) => setType(e.target.value as TypeString)}
                        className={inputClass}
                        disabled={submitting}
                    >
                        {ATTRIBUTE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {showOptions && (
                <div className="form-group">
                    <label htmlFor="def-options" className={labelClass}>
                        Options <span className="text-[#fa896b]">*</span>
                    </label>
                    <input
                        id="def-options"
                        type="text"
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                        className={inputClass}
                        placeholder={type === "COLOR" ? "#FF0000,#0000FF,#00FF00" : "Qizil,Ko'k,Yashil"}
                        disabled={submitting}
                    />
                    <p className="text-xs text-[#7c8fac] mt-1">
                        Vergul bilan ajratiladi. {type === "COLOR" ? "Har biri #HEX formatida bo'lishi kerak." : "Masalan: Qizil,Ko'k,Yashil"}
                    </p>
                </div>
            )}

            {showUnit && (
                <div className="form-group">
                    <label htmlFor="def-unit" className={labelClass}>
                        O'lchov birligi (unit)
                    </label>
                    <input
                        id="def-unit"
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className={inputClass}
                        placeholder="kg, cm, m², GB"
                        disabled={submitting}
                    />
                    <p className="text-xs text-[#7c8fac] mt-1">Masalan: kg, cm, m²</p>
                </div>
            )}

            {showMinMax && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label htmlFor="def-min" className={labelClass}>Min qiymat</label>
                        <input
                            id="def-min"
                            type="number"
                            value={minValue}
                            onChange={(e) => setMinValue(e.target.value)}
                            className={inputClass}
                            step="any"
                            disabled={submitting}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="def-max" className={labelClass}>Max qiymat</label>
                        <input
                            id="def-max"
                            type="number"
                            value={maxValue}
                            onChange={(e) => setMaxValue(e.target.value)}
                            className={inputClass}
                            step="any"
                            disabled={submitting}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="form-group">
                    <label htmlFor="def-order" className={labelClass}>Order (sort raqami)</label>
                    <input
                        id="def-order"
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                        className={inputClass}
                        min={0}
                        disabled={submitting}
                    />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#2A3547] form-group pt-1">
                    <input
                        type="checkbox"
                        checked={required}
                        onChange={(e) => setRequired(e.target.checked)}
                        className="w-4 h-4 rounded cursor-pointer accent-[#0085db]"
                        disabled={submitting}
                    />
                    <span>
                        Majburiy <span className="text-[#fa896b]">*</span>
                        <span className="block text-xs text-[#7c8fac] font-normal">Product yaratishda qiymat shart bo'ladi</span>
                    </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#2A3547] form-group pt-1">
                    <input
                        type="checkbox"
                        checked={forVariant}
                        onChange={(e) => setForVariant(e.target.checked)}
                        className="w-4 h-4 rounded cursor-pointer accent-[#0085db]"
                        disabled={submitting}
                    />
                    <span>
                        Variant turi
                        <span className="block text-xs text-[#7c8fac] font-normal">Belgilansa, product Builder'da variant o'qi sifatida chiqadi (masalan Rang, O'lcham)</span>
                    </span>
                </label>
            </div>

            {error && (
                <div className="flex items-start gap-2 bg-[#fdede8] border border-[#f7c8bb] text-[#a33a20] text-sm px-4 py-3 rounded-lg">
                    <span className="text-[#fa896b] mt-0.5">!</span>
                    <span>{error}</span>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 bg-[#0085db] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[#0072bd] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : (isEdit ? <Save size={16} /> : <Plus size={16} />)}
                    {isEdit ? "Saqlash" : "Qo'shish"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 bg-[#f0f2f5] text-[#5A6A85] px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[#e5e8ed] disabled:opacity-60"
                >
                    Bekor qilish
                </button>
            </div>
        </form>
    );
}
