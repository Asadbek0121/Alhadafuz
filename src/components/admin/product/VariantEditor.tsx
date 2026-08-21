"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  Trash2,
  Star,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { AttributeDef, VariantAxis, VariantImageItem, VariantRow } from "./types";
import { parseVariantKey } from "./types";
import { buildVariantKey, buildVariantLabel, parseOptions } from "@/lib/universal-product";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ROW_BATCH = 50;

const inputClass =
  "w-full px-2 py-1.5 rounded-md border border-[#e5eaef] outline-none text-sm text-[#2A3547] bg-white transition-colors focus:border-[#0085db]";
const btnIcon =
  "w-7 h-7 rounded-md flex items-center justify-center cursor-pointer border-none transition-colors";

interface VariantEditorProps {
  axes: VariantAxis[];
  onAxesChange: (axes: VariantAxis[]) => void;
  variants: VariantRow[];
  onVariantsChange: (variants: VariantRow[]) => void;
  variantDefs: AttributeDef[];
  deletedKeys: Set<string>;
  onDeletedKeysChange: (keys: Set<string>) => void;
  basePrice?: number;
  baseStock?: number;
  disabled?: boolean;
}

export default function VariantEditor({
  axes,
  onAxesChange,
  variants,
  onVariantsChange,
  variantDefs,
  deletedKeys,
  onDeletedKeysChange,
  basePrice = 0,
  baseStock = 0,
  disabled,
}: VariantEditorProps) {
  const [visibleCount, setVisibleCount] = useState(ROW_BATCH);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);

  const availableDefs = useMemo(
    () => variantDefs.filter((d) => !axes.some((a) => a.defId === d.id)),
    [variantDefs, axes]
  );

  /* ------------------------------------------------ axes */

  const updateAxis = (defId: string, patch: Partial<VariantAxis>) => {
    onAxesChange(axes.map((a) => (a.defId === defId ? { ...a, ...patch } : a)));
  };

  const addAxis = (defId: string) => {
    const def = variantDefs.find((d) => d.id === defId);
    if (!def) return;
    if (axes.some((a) => a.defId === defId)) return;
    const defaultValues = parseOptions(def.options);
    onAxesChange([
      ...axes,
      {
        defId: def.id,
        name: def.name,
        label: def.label,
        values: defaultValues,
      },
    ]);
  };

  const removeAxis = (defId: string) => {
    onAxesChange(axes.filter((a) => a.defId !== defId));
  };

  const setAxisValues = (defId: string, raw: string) => {
    const values = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    updateAxis(defId, { values });
  };

  /* ------------------------------------------------ combination generator */

  const comboCandidates = useMemo(() => {
    const activeAxes = axes.filter((a) => a.values.length > 0);
    if (activeAxes.length === 0) return [];
    let combos: Record<string, string>[] = [{}];
    for (const axis of activeAxes) {
      const next: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const v of axis.values) {
          next.push({ ...combo, [axis.name]: v });
        }
      }
      combos = next;
    }
    return combos;
  }, [axes]);

  const existingKeys = useMemo(() => new Set(variants.map((v) => v.key)), [variants]);

  const generateCombos = () => {
    const toAdd = comboCandidates.filter(
      (c) => !existingKeys.has(buildVariantKey(c)) && !deletedKeys.has(buildVariantKey(c))
    );
    if (toAdd.length === 0) {
      toast.info("Yangi kombinatsiyalar yo'q — hammasi allaqachon jadvalda");
      return;
    }
    const newRows: VariantRow[] = toAdd.map((options) => ({
      key: buildVariantKey(options),
      options,
      label: buildVariantLabel(options),
      sku: "",
      barcode: "",
      price: "",
      compareAtPrice: "",
      stock: "",
      weight: "",
      isDefault: false,
      isActive: true,
      images: [],
    }));
    onVariantsChange([...variants, ...newRows]);
    toast.success(`${toAdd.length} ta kombinatsiya qo'shildi`);
    setVisibleCount((c) => Math.max(c, variants.length + toAdd.length));
  };

  /* ------------------------------------------------ variant rows */

  const updateRow = (key: string, patch: Partial<VariantRow>) => {
    onVariantsChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };

  const setDefault = (key: string) => {
    onVariantsChange(variants.map((v) => ({ ...v, isDefault: v.key === key })));
  };

  const removeRow = (key: string) => {
    const row = variants.find((v) => v.key === key);
    const next = variants.filter((v) => v.key !== key);
    if (row?.id) {
      const dk = new Set(deletedKeys);
      dk.add(key);
      onDeletedKeysChange(dk);
    }
    onVariantsChange(next);
  };

  /* ------------------------------------------------ images */

  const uploadImages = async (files: File[]) => {
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name || "Fayl"}: faqat rasm qabul qilinadi`);
        return false;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: 10MB dan oshmasligi kerak`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;
    setUploading((n) => n + valid.length);
    const urls: string[] = [];
    try {
      await Promise.all(
        valid.map(async (f) => {
          const fd = new FormData();
          fd.append("file", f);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Yuklash xato (${res.status})`);
          if (!data.url) throw new Error("Server rasm manzilini qaytarmadi");
          urls.push(data.url);
        })
      );
      if (drawerKey && urls.length) {
        const row = variants.find((v) => v.key === drawerKey);
        if (row) {
          const current = row.images;
          const hasPrimary = current.some((i) => i.isPrimary);
          const appended: VariantImageItem[] = urls.map((url, i) => ({
            url,
            order: current.length + i,
            isPrimary: !hasPrimary && i === 0,
          }));
          updateRow(drawerKey, { images: [...current, ...appended] });
          toast.success(`${urls.length} ta rasm qo'shildi`);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Rasm yuklanmadi");
    } finally {
      setUploading((n) => Math.max(0, n - valid.length));
    }
  };

  const setPrimaryImage = (key: string, imageIdx: number) => {
    const row = variants.find((v) => v.key === key);
    if (!row) return;
    updateRow(key, {
      images: row.images.map((img, i) => ({ ...img, isPrimary: i === imageIdx })),
    });
  };

  const removeImage = (key: string, imageIdx: number) => {
    const row = variants.find((v) => v.key === key);
    if (!row) return;
    let images = row.images.filter((_, i) => i !== imageIdx);
    if (row.images[imageIdx]?.isPrimary && images.length > 0 && !images.some((i) => i.isPrimary)) {
      images = images.map((img, i) => (i === 0 ? { ...img, isPrimary: true } : img));
    }
    updateRow(key, { images });
  };

  const moveImage = (key: string, imageIdx: number, dir: -1 | 1) => {
    const row = variants.find((v) => v.key === key);
    if (!row) return;
    const images = [...row.images];
    const target = imageIdx + dir;
    if (target < 0 || target >= images.length) return;
    const [item] = images.splice(imageIdx, 1);
    images.splice(target, 0, item);
    updateRow(
      key,
      { images: images.map((img, i) => ({ ...img, order: i })) }
    );
  };

  const primaryImageOf = (row: VariantRow) =>
    row.images.find((i) => i.isPrimary) || row.images[0];

  /* ------------------------------------------------ render */

  const drawerRow = drawerKey ? variants.find((v) => v.key === drawerKey) : null;

  const activeAxes = axes.filter((a) => a.values.length > 0);
  const singleValueAxis =
    comboCandidates.length === 1 && activeAxes.length === 1 ? activeAxes[0] : null;
  const comboBreakdown =
    comboCandidates.length > 1
      ? activeAxes.map((a) => a.values.length).join(" × ")
      : null;

  return (
    <div className="space-y-6">
      {/* Axes (variant turi) */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h4 className="text-sm font-bold text-[#2A3547]">Sotib olish variantlari</h4>
          {axes.length > 0 && (
            <span className="text-xs font-semibold text-[#7c8fac]">
              {comboCandidates.length > 0
                ? comboCandidates.length === 1
                  ? "1 kombinatsiya mumkin"
                  : `${comboCandidates.length} kombinatsiya mumkin (${comboBreakdown} = ${comboCandidates.length})`
                : "Kombinatsiya uchun o'q qiymatlarini kiriting"}
            </span>
          )}
        </div>

        {axes.length === 0 && (
          <p className="text-xs text-[#9aa8bb] mb-3">
            Masalan: Kiyim uchun "Rang" va "O'lcham" variant sifatida tanlanadi. Shunda
            Qora/S, Qora/M, Oq/S kabi kombinatsiyalar avtomatik yaratiladi. O'qlar kategoriya
            xususiyatlaridan "Variant turi" sifatida belgilanganlardan tanlanadi.
          </p>
        )}

        <div className="space-y-2">
          {axes.map((axis) => {
            const def = variantDefs.find((d) => d.id === axis.defId);
            return (
              <div
                key={axis.defId}
                className="rounded-xl border border-[#e5eaef] bg-[#fafbfc] p-3"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-[#2A3547] flex items-center gap-1.5">
                    <Settings2 size={14} className="text-[#0085db]" />
                    {axis.label}
                    {def?.type === "COLOR" && (
                      <span className="text-[10px] font-medium text-[#9aa8bb] uppercase tracking-wide">
                        rang
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeAxis(axis.defId)}
                    title="O'qni olib tashlash"
                    aria-label={`${axis.label} o'qini olib tashlash`}
                    className={`${btnIcon} bg-[#fdede8] text-[#fa896b] hover:bg-[#fbdcd3] disabled:opacity-50`}
                  >
                    <X size={15} />
                  </button>
                </div>
                <input
                  type="text"
                  value={axis.values.join(", ")}
                  disabled={disabled}
                  onChange={(e) => setAxisValues(axis.defId, e.target.value)}
                  className={inputClass}
                  placeholder="Qora, Oq, Ko'k"
                />
                {def?.type === "COLOR" && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {axis.values.map((v) => (
                      <span
                        key={v}
                        style={{ background: v }}
                        title={v}
                        className="w-6 h-6 rounded-full border border-[#e5eaef]"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {singleValueAxis && (
          <div className="mt-3 rounded-lg border border-[#bfe3f7] bg-[#f0f8ff] px-3 py-2">
            <p className="text-xs text-[#0068ad]">
              "{singleValueAxis.label}" variant hozir bitta qiymatga ega —{" "}
              {singleValueAxis.values[0]}. Shuning uchun faqat 1 kombinatsiya mavjud. Boshqa
              qiymat qo'shsangiz kombinatsiyalar soni ko'payadi.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <select
            value=""
            disabled={disabled || availableDefs.length === 0}
            onChange={(e) => {
              if (e.target.value) addAxis(e.target.value);
              e.target.value = "";
            }}
            className={`${inputClass} max-w-[260px]`}
          >
            <option value="">
              {availableDefs.length === 0 ? "Qo'shish uchun o'q qolmadi" : "Variant turi tanlang..."}
            </option>
            {availableDefs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.type.toLowerCase()})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled || comboCandidates.length === 0}
            onClick={generateCombos}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#ecf2ff] text-[#0085db] text-sm font-semibold border-none cursor-pointer transition-colors hover:bg-[#dfe9ff] disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Kombinatsiyalarni generatsiya qilish
            {comboCandidates.length > 0 && ` (${comboCandidates.length})`}
          </button>
        </div>
      </div>

      {/* Variant table */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h4 className="text-sm font-bold text-[#2A3547]">
            Variantlar <span className="text-[#9aa8bb] font-medium">({variants.length})</span>
          </h4>
          {variants.length > visibleCount && (
            <span className="text-xs text-[#7c8fac]">
              {visibleCount} / {variants.length} ko'rsatilmoqda
            </span>
          )}
        </div>

        {variants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d7dfe8] bg-[#fafbfc] p-8 text-center">
            <p className="text-sm text-[#9aa8bb]">
              Hali variant yo'q. Yuqoridagi o'qlarni to'ldirib kombinatsiyalarni
              generatsiya qiling yoki mahsulot bitta variantga ega bo'lmasligi mumkin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#e5eaef] bg-white">
            <table className="w-full border-collapse text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[#f4f7fb] text-[#5A6A85] text-xs uppercase tracking-wide">
                  <th className="px-3 py-2.5 text-left font-semibold">Variant</th>
                  <th className="px-2 py-2.5 text-left font-semibold">SKU</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Shtrix</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Narx</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Eski narx</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Stock</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Og'irlik (g)</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Default</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Faol</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Rasmlar</th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {variants.slice(0, visibleCount).map((row) => {
                  const primary = primaryImageOf(row);
                  return (
                    <tr key={row.key} className="border-t border-[#eef2f6] hover:bg-[#fafcfe]">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#e5eaef] bg-[#f4f7fb] shrink-0 flex items-center justify-center">
                            {primary ? (
                              <img
                                src={primary.url}
                                alt={row.label}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[#c3cede] text-xs">
                                <UploadCloud size={16} />
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-[#2A3547] text-xs leading-tight">
                            {row.label || row.key}
                            {row.id && (
                              <span className="block text-[10px] text-[#9aa8bb] font-normal">
                                saqlangan
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.sku}
                          disabled={disabled}
                          onChange={(e) => updateRow(row.key, { sku: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.barcode}
                          disabled={disabled}
                          onChange={(e) => updateRow(row.key, { barcode: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.price}
                          disabled={disabled}
                          placeholder={basePrice ? String(basePrice) : "0"}
                          onChange={(e) => updateRow(row.key, { price: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.compareAtPrice}
                          disabled={disabled}
                          onChange={(e) => updateRow(row.key, { compareAtPrice: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.stock}
                          disabled={disabled}
                          placeholder={baseStock ? String(baseStock) : "0"}
                          onChange={(e) => updateRow(row.key, { stock: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.weight}
                          disabled={disabled}
                          onChange={(e) => updateRow(row.key, { weight: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="radio"
                          name="variant-default"
                          checked={row.isDefault}
                          disabled={disabled}
                          onChange={() => setDefault(row.key)}
                          title="Asosiy variant"
                          aria-label={`${row.label} asosiy qilish`}
                          className="w-4 h-4 accent-[#0085db] cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          disabled={disabled}
                          onChange={(e) => updateRow(row.key, { isActive: e.target.checked })}
                          aria-label={`${row.label} faolligi`}
                          className="w-4 h-4 accent-[#0085db] cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setDrawerKey(row.key)}
                          title="Variant rasmlari"
                          aria-label={`${row.label} rasmlari`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f0f2f5] text-[#5A6A85] text-xs font-semibold border-none cursor-pointer transition-colors hover:bg-[#e5e8ed] disabled:opacity-50"
                        >
                          <Star size={12} className="text-[#f59e0b]" />
                          {row.images.length > 0 ? (
                            <span className="flex -space-x-1.5">
                              {row.images.slice(0, 3).map((img, i) => (
                                <img
                                  key={i}
                                  src={img.url}
                                  alt=""
                                  className="w-6 h-6 rounded-full border-2 border-white object-cover"
                                />
                              ))}
                            </span>
                          ) : (
                            <span>0 img</span>
                          )}
                          <span className="font-bold">{row.images.length}</span>
                        </button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeRow(row.key)}
                          title="Variantni o'chirish"
                          aria-label={`${row.label} variantini o'chirish`}
                          className={`${btnIcon} bg-[#fdede8] text-[#fa896b] hover:bg-[#fbdcd3] disabled:opacity-50`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {variants.length > visibleCount && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setVisibleCount((c) => c + ROW_BATCH)}
              className="px-4 py-2 rounded-lg bg-[#f0f2f5] text-[#5A6A85] text-sm font-semibold border-none cursor-pointer transition-colors hover:bg-[#e5e8ed] disabled:opacity-50"
            >
              Ko'proq ko'rsatish ({Math.min(ROW_BATCH, variants.length - visibleCount)} ta)
            </button>
          </div>
        )}

        {variants.length > 0 && (
          <p className="text-xs text-[#7c8fac] mt-2">
            Bo'sh narx/stock — mahsulot bazaviy qiymatini meros qiladi. "Default" faqat bitta
            variantga belgilanadi.
          </p>
        )}
      </div>

      {/* Images drawer */}
      {drawerRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${drawerRow.label} rasmlari`}
          onClick={() => setDrawerKey(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5eaef]">
              <div>
                <h3 className="text-base font-bold text-[#2A3547]">
                  {drawerRow.label || drawerRow.key}
                </h3>
                <p className="text-xs text-[#7c8fac]">
                  {drawerRow.images.length} ta rasm · bitta primary tanlash mumkin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerKey(null)}
                className={`${btnIcon} bg-[#f0f2f5] text-[#5A6A85] hover:bg-[#e5e8ed]`}
                aria-label="Yopish"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {drawerRow.images.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#d7dfe8] bg-[#fafbfc] p-8 text-center mb-4">
                  <p className="text-sm text-[#9aa8bb]">Bu variant uchun rasm yo'q</p>
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {drawerRow.images.map((img, i) => (
                  <div
                    key={img.id || `${img.url}-${i}`}
                    className={`relative rounded-xl overflow-hidden border-2 ${
                      img.isPrimary ? "border-[#0085db]" : "border-[#e5eaef]"
                    }`}
                  >
                    <div className="aspect-square bg-[#f4f7fb]">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    {img.isPrimary && (
                      <span className="absolute top-1.5 left-1.5 bg-[#0085db] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        ASOSIY
                      </span>
                    )}
                    <div className="flex items-center justify-between p-1.5 bg-white gap-0.5">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setPrimaryImage(drawerRow.key, i)}
                        title="Asosiy qilish"
                        aria-label="Asosiy qilish"
                        className={`${btnIcon} text-[#f59e0b] hover:bg-[#fffbeb]`}
                      >
                        <Star size={14} fill={img.isPrimary ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || i === 0}
                        onClick={() => moveImage(drawerRow.key, i, -1)}
                        title="Chapga"
                        aria-label="Chapga surish"
                        className={`${btnIcon} text-[#5A6A85] hover:bg-[#f0f2f5] disabled:opacity-30`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || i === drawerRow.images.length - 1}
                        onClick={() => moveImage(drawerRow.key, i, 1)}
                        title="O'ngga"
                        aria-label="O'ngga surish"
                        className={`${btnIcon} text-[#5A6A85] hover:bg-[#f0f2f5] disabled:opacity-30`}
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeImage(drawerRow.key, i)}
                        title="O'chirish"
                        aria-label="Rasmni o'chirish"
                        className={`${btnIcon} text-[#fa896b] hover:bg-[#fdede8]`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                <label
                  className={`aspect-square rounded-xl border-2 border-dashed border-[#d7dfe8] flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[#9aa8bb] transition-colors hover:border-[#0085db] hover:text-[#0085db] ${
                    disabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Rasm yuklash"
                >
                  {uploading > 0 ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-xs font-medium">Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={22} />
                      <span className="text-xs font-medium">Rasm qo'shish</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={disabled || uploading > 0}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) void uploadImages(Array.from(e.target.files));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-[#7c8fac] mt-3">
                Yuklangan rasm avval bu variant saqlangan bo'lsa darhol, yangi variant uchun
                mahsulot saqlangach qo'llaniladi.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-[#e5eaef] flex justify-end">
              <button
                type="button"
                onClick={() => setDrawerKey(null)}
                className="px-4 py-2 rounded-lg bg-[#0085db] text-white text-sm font-semibold border-none cursor-pointer transition-colors hover:bg-[#0072bd]"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
