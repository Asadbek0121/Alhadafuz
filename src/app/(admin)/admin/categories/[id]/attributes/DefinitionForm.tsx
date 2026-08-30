"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, X } from "lucide-react";
import { ATTRIBUTE_TYPES, VALID_HEX_COLOR, parseOptions, validateDefinitionTypeCombo } from "@/lib/universal-product";
import type { AttributeDef } from "@/components/admin/product/types";

type TypeString = (typeof ATTRIBUTE_TYPES)[number];

const CYRILLIC_TO_LATIN: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "x", ц: "c", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "",
    э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/**
 * Label'dan texnik nom (slug) generatsiya qiladi:
 * kirill/lotin harflar, probellar va maxsus belgilar → kichik lotin harflar + underscore.
 * Agar natija bo'sh bo'lsa (masalan butunlay boshqa belgilar) `attr_<timestamp>` fallback.
 */
export function slugifyLabel(label: string): string {
    let slug = label
        .trim()
        .toLowerCase()
        .split("")
        .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
        .join("")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 100)
        .replace(/_+$/g, "");
    if (slug.length === 0) {
        slug = `attr_${Date.now()}`;
    }
    return slug;
}

const TYPE_DEFS: Record<TypeString, { optionLabel: string; hint: string }> = {
    TEXT: { optionLabel: "TEXT — Matn", hint: "Erkin matn kiritiladi. Masalan: Material, Brend." },
    NUMBER: { optionLabel: "NUMBER — Raqam", hint: "Son kiritiladi. Masalan: vazn, hajm." },
    BOOLEAN: { optionLabel: "BOOLEAN — Ha/Yo'q", hint: "Faqat Ha yoki Yo'q tanlanadi." },
    SELECT: { optionLabel: "SELECT — Bittasini tanlash", hint: "Siz qo'shgan qiymatlardan faqat bittasi tanlanadi." },
    MULTI_SELECT: { optionLabel: "MULTI_SELECT — Bir nechtasini tanlash", hint: "Siz qo'shgan qiymatlardan bir nechtasi tanlanishi mumkin." },
    COLOR: { optionLabel: "COLOR — Rang", hint: "Ranglar qo'shiladi. Har biri #HEX formatida (masalan: #FF0000)." },
    MEASUREMENT: { optionLabel: "MEASUREMENT — Qiymat + birlik", hint: "Raqam va o'lchov birligi kiritiladi. Masalan: 1.5 kg." },
    DATE: { optionLabel: "DATE — Sana", hint: "Sana tanlanadi." },
};

interface DefinitionFormProps {
    categoryId: string;
    initial?: AttributeDef | null;
    presetForVariant?: boolean;
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
const checkClass = "w-4 h-4 rounded cursor-pointer accent-[#0085db]";

export default function DefinitionForm({
    categoryId,
    initial,
    presetForVariant,
    defaultOrder,
    onSaved,
    onCancel,
}: DefinitionFormProps) {
    const isEdit = !!initial?.id;

    const [label, setLabel] = useState(initial?.label ?? "");
    const [manualName, setManualName] = useState(initial?.name ?? "");
    const [showAdvancedName, setShowAdvancedName] = useState(false);
    const [type, setType] = useState<TypeString>((initial?.type as TypeString) || "TEXT");
    const [required, setRequired] = useState(initial?.required ?? false);
    const [forVariant, setForVariant] = useState(initial?.forVariant ?? presetForVariant ?? false);
    const [order, setOrder] = useState(String(initial?.order ?? defaultOrder ?? 0));
    const [options, setOptions] = useState(initial?.options ?? "");
    const [optionDraft, setOptionDraft] = useState("");
    const [unit, setUnit] = useState(initial?.unit ?? "");
    const [allowedUnits, setAllowedUnits] = useState(initial?.allowedUnits ?? "");
    const [minValue, setMinValue] = useState(initial?.minValue != null ? String(initial.minValue) : "");
    const [maxValue, setMaxValue] = useState(initial?.maxValue != null ? String(initial.maxValue) : "");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Type'ga qarab dinamik maydonlar
    const showOptions = type === "SELECT" || type === "MULTI_SELECT" || type === "COLOR";
    const showUnit = type === "MEASUREMENT";
    const showMinMax = type === "NUMBER";
    const optionList = parseOptions(options);

    const addOption = () => {
        const v = optionDraft.trim();
        if (!v) return;
        if (type === "COLOR" && !VALID_HEX_COLOR.test(v)) {
            setError(`Rang #HEX formatida bo'lishi kerak (masalan: #FF0000)`);
            return;
        }
        setError(null);
        const cur = parseOptions(options);
        if (cur.includes(v)) {
            setOptionDraft("");
            return;
        }
        setOptions([...cur, v].join(","));
        setOptionDraft("");
    };

    const removeOption = (v: string) => {
        setOptions(parseOptions(options).filter((o) => o !== v).join(","));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const labelValue = label.trim();
        if (!labelValue) {
            setError("Nomi majburiy");
            return;
        }

        // name avtomatik yoki qo'lda (advanced toggle)
        let nameValue: string;
        if (isEdit) {
            if (showAdvancedName) {
                nameValue = manualName.trim();
            } else if (labelValue === (initial?.label ?? "").trim()) {
                nameValue = initial?.name ?? "";
            } else {
                nameValue = slugifyLabel(labelValue);
            }
        } else {
            nameValue = showAdvancedName ? manualName.trim() : slugifyLabel(labelValue);
        }
        if (!nameValue) {
            setError("Texnik nom bo'sh bo'lishi mumkin emas");
            return;
        }
        nameValue = nameValue.slice(0, 100);

        const payload = {
            name: nameValue,
            label: labelValue,
            type,
            required,
            forVariant,
            order: Math.max(0, Number(order) || 0),
            options: showOptions ? options.trim() || null : null,
            unit: showUnit ? unit.trim() || null : null,
            allowedUnits: showUnit ? allowedUnits.trim() || null : null,
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
            <div className="rounded-lg bg-[#f0f7ff] border border-[#d3e6f7] px-4 py-3 space-y-1.5 text-sm text-[#2A3547]">
                <p>
                    <span className="font-bold text-[#0085db]">Xususiyat</span> — mahsulotni tavsiflaydi (masalan: Material, Brend).
                </p>
                <p>
                    <span className="font-bold text-[#0085db]">Variant</span> — xaridor tanlaydi va har bir variant alohida narx/stock/rasmga ega bo'lishi mumkin (masalan: Rang, O'lcham).
                </p>
            </div>

            <div className="form-group">
                <label htmlFor="def-label" className={labelClass}>
                    Nomi <span className="text-[#fa896b]">*</span>
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
                <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-[#7c8fac]">
                        Xaridor va mahsulot sahifasida aynan shu nom ko'rinadi.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowAdvancedName((v) => !v)}
                        className="text-xs font-semibold text-[#0085db] hover:underline ml-auto shrink-0"
                    >
                        {showAdvancedName ? "Texnik nomni yashirish" : "Texnik nomni tahrirlash"}
                    </button>
                </div>
                {showAdvancedName && (
                    <div className="mt-2">
                        <label htmlFor="def-name" className="block mb-1.5 text-xs font-medium text-[#7c8fac]">
                            Texnik nom (name) — systema uchun
                        </label>
                        <input
                            id="def-name"
                            type="text"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            className={inputClass}
                            placeholder="masalan: material"
                            disabled={submitting}
                        />
                        <p className="text-xs text-[#7c8fac] mt-1">
                            Bo'sh qoldirsangiz, nomingizdan avtomatik generatsiya qilinadi (masalan: "Sahifa soni" → "sahifa_soni").
                        </p>
                    </div>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="def-type" className={labelClass}>
                    Qiymat turi <span className="text-[#fa896b]">*</span>
                </label>
                <select
                    id="def-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as TypeString)}
                    className={inputClass}
                    disabled={submitting}
                >
                    {ATTRIBUTE_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_DEFS[t].optionLabel}</option>
                    ))}
                </select>
                <p className="text-xs text-[#7c8fac] mt-1">{TYPE_DEFS[type].hint}</p>
            </div>

            {showOptions && (
                <div className="form-group">
                    <label className={labelClass}>
                        Qiymatlar {type === "SELECT" || type === "MULTI_SELECT" ? <span className="text-[#fa896b]">*</span> : null}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={optionDraft}
                            onChange={(e) => setOptionDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    addOption();
                                }
                            }}
                            className={inputClass}
                            placeholder={type === "COLOR" ? "masalan: #FF0000" : "masalan: Qizil"}
                            disabled={submitting}
                        />
                        <button
                            type="button"
                            onClick={addOption}
                            disabled={submitting || !optionDraft.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#0085db] text-[#0085db] text-sm font-semibold transition-colors hover:bg-[#ecf2ff] disabled:opacity-50 shrink-0"
                        >
                            <Plus size={15} /> Qo'shish
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        {optionList.length === 0 ? (
                            <span className="text-xs text-[#9aa8bb]">Hozircha qiymat qo'shilmagan</span>
                        ) : (
                            optionList.map((opt, i) => (
                                <span
                                    key={`${opt}-${i}`}
                                    className="inline-flex items-center gap-1.5 bg-[#f0f2f5] border border-[#e5eaef] rounded-full pl-3 pr-2 py-1.5 text-sm text-[#2A3547]"
                                >
                                    {type === "COLOR" && (
                                        <span
                                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                            style={{ backgroundColor: opt }}
                                        />
                                    )}
                                    {opt}
                                    <button
                                        type="button"
                                        onClick={() => removeOption(opt)}
                                        disabled={submitting}
                                        className="text-[#9aa8bb] hover:text-[#fa896b] transition-colors p-0.5"
                                        aria-label={`${opt} ni o'chirish`}
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showUnit && (
                <div className="form-group">
                    <label htmlFor="def-unit" className={labelClass}>
                        O'lchov birligi
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

            {showUnit && (
                <div className="form-group">
                    <label htmlFor="def-allowed-units" className={labelClass}>
                        Ruxsat etilgan birliklar (ixtiyoriy)
                    </label>
                    <input
                        id="def-allowed-units"
                        type="text"
                        value={allowedUnits}
                        onChange={(e) => setAllowedUnits(e.target.value)}
                        className={inputClass}
                        placeholder="g, kg, t"
                        disabled={submitting}
                    />
                    <p className="text-xs text-[#7c8fac] mt-1">
                        Vergul bilan ajrating. To'ldirilsa, mahsulot formasida birlik select sifatida chiqadi
                        (masalan: "g, kg, t"). Bo'sh bo'lsa, yuqoridagi yagona birlik ishlatiladi.
                    </p>
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
                    <label htmlFor="def-order" className={labelClass}>Ko'rsatish tartibi</label>
                    <input
                        id="def-order"
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                        className={inputClass}
                        min={0}
                        disabled={submitting}
                    />
                    <p className="text-xs text-[#7c8fac] mt-1">Qanchalik kichik bo'lsa, formada shunchalik birinchi chiqadi</p>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer text-sm text-[#2A3547] form-group pt-1">
                    <input
                        type="checkbox"
                        checked={required}
                        onChange={(e) => setRequired(e.target.checked)}
                        className={`${checkClass} mt-0.5`}
                        disabled={submitting}
                    />
                    <span>
                        To'ldirish shart <span className="text-[#fa896b]">*</span>
                        <span className="block text-xs text-[#7c8fac] font-normal">
                            Mahsulot saqlanishidan oldin ushbu maydon to'ldirilishi kerak.
                        </span>
                    </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-sm text-[#2A3547] form-group pt-1">
                    <input
                        type="checkbox"
                        checked={forVariant}
                        onChange={(e) => setForVariant(e.target.checked)}
                        className={`${checkClass} mt-0.5`}
                        disabled={submitting}
                    />
                    <span>
                        Xaridor tanlaydigan variant
                        <span className="block text-xs text-[#7c8fac] font-normal">
                            Masalan: Rang, O'lcham, Xotira. Xaridor buni tanlaydi va har bir variant alohida narx/stock/rasmga ega bo'lishi mumkin.
                        </span>
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
