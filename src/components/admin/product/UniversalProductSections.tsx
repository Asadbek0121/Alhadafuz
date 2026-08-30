"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { AttributeDef, AttributeExtraValue, ProductAttributeRow, VariantAxis, VariantRow } from "./types";
import { parseVariantKey } from "./types";
import { validateAttributeValue, parseOptions } from "@/lib/universal-product";
import AttributeFields, { evalCondition } from "./AttributeFields";
import VariantEditor from "./VariantEditor";

export interface UniversalProductRef {
  validate(): string | null;
  saveAttributesAndVariants(productId: string): Promise<boolean>;
  /** Atomic save uchun — attributes + variants payload'ni qaytaradi (create/update uchun). */
  buildPayload(): { attributes: { attributeDefId: string; value: unknown }[] | null; variants: any[] | null };
}

interface UniversalProductSectionsProps {
  productId?: string | null;
  categoryId: string | null;
  onCategoryWarning?: (show: boolean) => void;
  disabled?: boolean;
}

const UniversalProductSections = forwardRef<UniversalProductRef, UniversalProductSectionsProps>(
  function UniversalProductSections({ productId, categoryId, onCategoryWarning, disabled }, ref) {
    const [defs, setDefs] = useState<AttributeDef[]>([]);
    const [extraValues, setExtraValues] = useState<AttributeExtraValue[]>([]);
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});
    const [loadingDefs, setLoadingDefs] = useState(false);
    const [loadingVariants, setLoadingVariants] = useState(false);
    const [errorDefs, setErrorDefs] = useState<string | null>(null);
    const [axes, setAxes] = useState<VariantAxis[]>([]);
    const [variants, setVariants] = useState<VariantRow[]>([]);
    const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());

    const prevCategoryId = useRef<string | null>(null);
    const prevProductId = useRef<string | null>(null);
    const valuesRef = useRef<Record<string, unknown>>({});
    const productsLoaded = useRef(false);

    // Keep latest values in a ref so loadDefs stays stable and doesn't retrigger.
    useEffect(() => {
      valuesRef.current = values;
    }, [values]);

    const loadDefsForCategory = useCallback(async (catId: string) => {
      setLoadingDefs(true);
      setErrorDefs(null);
      try {
        const res = await fetch(`/api/admin/categories/${catId}/attributes`);
        if (!res.ok) throw new Error(`Server xatosi (${res.status})`);
        const data = await res.json();
        const attrs: AttributeDef[] = data.definitions || [];

        const newDefIds = new Set(attrs.map((d) => d.id));
        const preserved: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(valuesRef.current)) {
          if (newDefIds.has(k)) preserved[k] = v;
        }
        // Structured values from DB (edit mode) for defs present in new category
        if (productId) {
          try {
            const pRes = await fetch(`/api/admin/products/${productId}/attributes`);
            if (pRes.ok) {
              const pData = await pRes.json();
              for (const a of pData.attributes || []) {
                if (a.value !== undefined && a.value !== null && newDefIds.has(a.id)) {
                  preserved[a.id] = a.value;
                }
              }
            }
          } catch {
            // ignore
          }
        }
        setDefs(attrs);
        setExtraValues([]);
        setValues(preserved);
        setAttributeErrors({});
      } catch (e: any) {
        setErrorDefs(e.message || "Xususiyatlar yuklanmadi");
        setDefs([]);
      } finally {
        setLoadingDefs(false);
      }
    }, [productId]);

    const loadProductAttributes = useCallback(async (pId: string) => {
      setLoadingDefs(true);
      setErrorDefs(null);
      try {
        const res = await fetch(`/api/admin/products/${pId}/attributes`);
        if (!res.ok) throw new Error(`Server xatosi (${res.status})`);
        const data = await res.json();
        const attrs: ProductAttributeRow[] = data.attributes || [];
        setDefs(attrs);
        setExtraValues(data.extraValues || []);
        const newValues: Record<string, unknown> = {};
        for (const a of attrs) {
          if (a.value !== undefined && a.value !== null) {
            newValues[a.id] = a.value;
          }
        }
        setValues(newValues);
        setAttributeErrors({});
      } catch (e: any) {
        setErrorDefs(e.message || "Xususiyatlar yuklanmadi");
        setDefs([]);
      } finally {
        setLoadingDefs(false);
      }
    }, []);

    const loadVariants = useCallback(async (pId: string) => {
      setLoadingVariants(true);
      try {
        const res = await fetch(`/api/admin/products/${pId}/variants`);
        if (!res.ok) throw new Error(`Server xatosi (${res.status})`);
        const data = await res.json();
        const list: any[] = data.variants || [];
        const rows: VariantRow[] = list.map((v: any) => {
          const key = v.variantKey || "";
          const options = parseVariantKey(key);
          return {
            key,
            options,
            label: v.variantLabel || key,
            sku: v.sku || "",
            barcode: v.barcode || "",
            price: v.price !== undefined && v.price !== 0 ? String(v.price) : "",
            compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : "",
            stock: v.stock !== undefined && v.stock !== -1 ? String(v.stock) : "",
            weight: v.weight ? String(v.weight) : "",
            isDefault: !!v.isDefault,
            isActive: v.isActive !== false,
            images: (v.images || []).map((img: any) => ({
              id: img.id,
              url: img.url,
              order: img.order,
              isPrimary: !!img.isPrimary,
            })),
            id: v.id,
          };
        });
        setVariants(rows);
      } catch (e: any) {
        toast.error("Variantlar yuklanmadi: " + (e.message || "xato"));
      } finally {
        setLoadingVariants(false);
      }
    }, []);

    // Load product data once on mount (edit mode)
    useEffect(() => {
      if (productId && productId !== prevProductId.current) {
        prevProductId.current = productId;
        if (prevCategoryId.current === null) {
          prevCategoryId.current = categoryId;
        }
        void loadProductAttributes(productId);
        void loadVariants(productId);
        productsLoaded.current = true;
      }
    }, [productId, categoryId, loadProductAttributes, loadVariants]);

    // Load defs when category changes (create mode, or category switch in edit mode)
    useEffect(() => {
      if (!categoryId) {
        setDefs([]);
        setExtraValues([]);
        setAxes([]);
        prevCategoryId.current = null;
        return;
      }
      if (prevCategoryId.current !== categoryId) {
        const firstCategorySet = prevCategoryId.current === null;
        prevCategoryId.current = categoryId;
        if (!firstCategorySet && Object.keys(valuesRef.current).length > 0) {
          onCategoryWarning?.(true);
        }
        // Edit mode: product attributes already loaded defs+values on mount.
        // Only refetch from the category endpoint on an actual category *change*.
        if (!(productsLoaded.current && firstCategorySet)) {
          void loadDefsForCategory(categoryId);
        }
      }
    }, [categoryId, onCategoryWarning, loadDefsForCategory]);

    // Initial axes from defs (auto-select forVariant defs as axes on first load).
    // Faqat axes bo'sh bo'lsa yaratadi — user o'zi sozlagan o'qlarni buzmaydi.
    useEffect(() => {
      if (defs.length === 0) return;
      const forVariantDefs = defs.filter((d) => d.forVariant);
      if (forVariantDefs.length === 0) return;
      setAxes((prev) => {
        if (prev.length > 0) return prev;
        return forVariantDefs.map((d) => {
          // Edit mode: existing variant qiymatlaridan o'q qiymatlarini to'ldiramiz
          const used = new Set<string>();
          for (const v of variants) {
            const val = v.options?.[d.name];
            if (val) used.add(val);
          }
          return {
            defId: d.id,
            name: d.name,
            label: d.label,
            values: Array.from(used),
          };
        });
      });
    }, [defs, variants]);

    const attributeDefs = useMemo(() => defs.filter((d) => !d.forVariant && d.isActive !== false), [defs]);
    const variantDefs = useMemo(() => defs.filter((d) => d.forVariant && d.isActive !== false), [defs]);

    // ---- validation ----

    const validate = useCallback((): string | null => {
      const errors: Record<string, string> = {};
      for (const def of attributeDefs) {
        // visibleWhen sharti bajarilmasa field yashirin — majburiy ham emas
        if (def.visibleWhen && !evalCondition(def.visibleWhen, valuesRef.current)) {
          continue;
        }
        let v = valuesRef.current[def.id];
        // MEASUREMENT object bo'sh value bilan to'ldirilgan bo'lsa — bo'sh deb hisoblaymiz
        if (def.type === "MEASUREMENT" && v && typeof v === "object") {
          const obj = v as { value?: unknown };
          if (obj.value === undefined || obj.value === null || obj.value === "") v = "";
        }
        if (v === undefined || v === null || v === "") {
          // requiredWhen: faqat shart bajarilganda majburiy
          const required = def.required || (def.requiredWhen && evalCondition(def.requiredWhen, valuesRef.current));
          if (required) {
            errors[def.id] = `${def.label} qiymati shart`;
          }
          continue;
        }
        const err = validateAttributeValue(def, v);
        if (err) errors[def.id] = err;
      }
      setAttributeErrors(errors);

      const keys = variants.map((v) => v.key);
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      if (dupes.length > 0) {
        return `Dublikat variant kalitlari: ${dupes.join(", ")}`;
      }

      if (Object.keys(errors).length > 0) {
        return Object.values(errors)[0];
      }
      return null;
    }, [attributeDefs, variants]);

    // ---- save ----

    const saveAttributesAndVariants = useCallback(
      async (pId: string): Promise<boolean> => {
        try {
          // 1. Structured attributes PUT (bulk replace)
          if (defs.length > 0) {
            const attrs = defs.map((d) => {
              let v = valuesRef.current[d.id];
              if (d.forVariant) {
                const axis = axes.find((a) => a.defId === d.id);
                const axisValues = axis && axis.values.length > 0 ? axis.values : parseOptions(d.options);
                if (d.required && axisValues.length > 0) {
                  v = d.type === "MULTI_SELECT" ? axisValues : axisValues[0];
                }
              }
              if (d.type === "MEASUREMENT" && v && typeof v === "object") {
                const obj = v as { value?: unknown };
                if (obj.value === undefined || obj.value === null || obj.value === "") v = null;
              }
              if (d.type === "NUMBER" && (v === "" || v === null)) v = null;
              return {
                attributeDefId: d.id,
                value: v === undefined || v === null || v === "" ? null : v,
              };
            });
            const res = await fetch(`/api/admin/products/${pId}/attributes`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attributes: attrs }),
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || "Xususiyatlar saqlanmadi");
            }
          }

          // 2. Variants diff — read current server variants
          let serverVariants: any[] = [];
          try {
            const existingRes = await fetch(`/api/admin/products/${pId}/variants`);
            if (existingRes.ok) {
              const existingData = await existingRes.json();
              serverVariants = existingData.variants || [];
            }
          } catch {
            // ignore
          }

          const toDelete = serverVariants.filter((v: any) => {
            const row = variants.find((r) => r.id === v.id);
            return !row || deletedKeys.has(row.key);
          });
          const toUpdate = variants.filter((v) => v.id && !deletedKeys.has(v.key));
          const toCreate = variants.filter((v) => !v.id && !deletedKeys.has(v.key));

          for (const sv of toDelete) {
            try {
              await fetch(`/api/admin/products/${pId}/variants/${sv.id}`, { method: "DELETE" });
            } catch (e: any) {
              console.error("Variant delete error:", e);
            }
          }

          const buildVariantBody = (v: VariantRow) => {
            const body: Record<string, unknown> = {
              options: v.options,
              sku: v.sku || null,
              barcode: v.barcode || null,
            };
            if (v.price !== "") body.price = Number(v.price);
            if (v.compareAtPrice !== "") body.compareAtPrice = Number(v.compareAtPrice);
            if (v.stock !== "") body.stock = Number(v.stock);
            if (v.weight !== "") body.weight = Number(v.weight);
            body.isDefault = v.isDefault;
            body.isActive = v.isActive;
            return body;
          };

          const uploadImagesFor = async (variantId: string, images: VariantRow["images"]) => {
            for (const img of images) {
              try {
                await fetch(`/api/admin/products/${pId}/variants/${variantId}/images`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: img.url, order: img.order, isPrimary: img.isPrimary }),
                });
              } catch (e: any) {
                console.error("Variant image create error:", e);
              }
            }
          };

          for (const v of toCreate) {
            try {
              const res = await fetch(`/api/admin/products/${pId}/variants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildVariantBody(v)),
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Variant ${v.label} yaratilmadi`);
              }
              const created = await res.json();
              const newId = created.variant?.id;
              if (newId && v.images.length > 0) {
                await uploadImagesFor(newId, v.images);
              }
            } catch (e: any) {
              toast.error(`Variant "${v.label}" yaratilmadi: ${e.message}`);
            }
          }

          for (const v of toUpdate) {
            try {
              const res = await fetch(`/api/admin/products/${pId}/variants/${v.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildVariantBody(v)),
              });
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Variant ${v.label} yangilanmadi`);
              }
            } catch (e: any) {
              toast.error(`Variant "${v.label}" yangilanmadi: ${e.message}`);
            }

            // 3. Images sync for existing variants
            try {
              const imgRes = await fetch(`/api/admin/products/${pId}/variants/${v.id}/images`);
              let serverImages: any[] = [];
              if (imgRes.ok) {
                serverImages = (await imgRes.json()).images || [];
              }
              const clientIds = new Set(v.images.filter((i) => i.id).map((i) => i.id));
              for (const si of serverImages) {
                if (!clientIds.has(si.id)) {
                  try {
                    await fetch(`/api/admin/products/${pId}/variants/${v.id}/images/${si.id}`, { method: "DELETE" });
                  } catch (e: any) {
                    console.error("Image delete error:", e);
                  }
                }
              }
              for (const ci of v.images) {
                if (ci.id) {
                  const server = serverImages.find((si: any) => si.id === ci.id);
                  const patch: Record<string, unknown> = {};
                  if (server && server.order !== ci.order) patch.order = ci.order;
                  if (server && server.isPrimary !== ci.isPrimary) patch.isPrimary = ci.isPrimary;
                  if (server && server.url !== ci.url) patch.url = ci.url;
                  if (Object.keys(patch).length > 0) {
                    try {
                      await fetch(`/api/admin/products/${pId}/variants/${v.id}/images/${ci.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(patch),
                      });
                    } catch (e: any) {
                      console.error("Image update error:", e);
                    }
                  }
                } else {
                  try {
                    await fetch(`/api/admin/products/${pId}/variants/${v.id}/images`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: ci.url, order: ci.order, isPrimary: ci.isPrimary }),
                    });
                  } catch (e: any) {
                    console.error("Image create error:", e);
                  }
                }
              }
            } catch (e: any) {
              console.error("Image sync error:", e);
            }
          }

          return true;
        } catch (e: any) {
          toast.error(e.message || "Xususiyatlar/variantlar saqlanmadi");
          return false;
        }
      },
      [defs, axes, variants, deletedKeys]
    );

    useImperativeHandle(
      ref,
      () => ({
        validate,
        saveAttributesAndVariants,
        buildPayload: () => {
          const attrs = defs.length > 0 ? defs.map((d) => {
            let v = valuesRef.current[d.id];
            if (d.forVariant) {
              const axis = axes.find((a) => a.defId === d.id);
              const axisValues = axis && axis.values.length > 0 ? axis.values : parseOptions(d.options);
              if (d.required && axisValues.length > 0) {
                v = d.type === "MULTI_SELECT" ? axisValues : axisValues[0];
              }
            }
            if (d.type === "MEASUREMENT" && v && typeof v === "object") {
              const obj = v as { value?: unknown };
              if (obj.value === undefined || obj.value === null || obj.value === "") v = null;
            }
            if (d.type === "NUMBER" && (v === "" || v === null)) v = null;
            return {
              attributeDefId: d.id,
              value: v === undefined || v === null || v === "" ? null : v,
            };
          }) : null;

          const buildVariantBody = (v: VariantRow) => ({
            options: v.options,
            sku: v.sku || null,
            barcode: v.barcode || null,
            price: v.price !== "" ? Number(v.price) : undefined,
            compareAtPrice: v.compareAtPrice !== "" ? Number(v.compareAtPrice) : null,
            stock: v.stock !== "" ? Number(v.stock) : undefined,
            weight: v.weight !== "" ? Number(v.weight) : null,
            isDefault: v.isDefault,
            isActive: v.isActive,
            images: v.images.map((img) => ({ url: img.url, order: img.order, isPrimary: img.isPrimary })),
          });

          const vars = variants.filter((v) => !deletedKeys.has(v.key)).map(buildVariantBody);

          return { attributes: attrs, variants: vars.length > 0 ? vars : null };
        },
      }),
      [validate, saveAttributesAndVariants, defs, axes, variants, deletedKeys]
    );

    if (loadingDefs && defs.length === 0) {
      return (
        <div className="py-8 text-center">
          <Loader2 size={20} className="animate-spin inline-block text-[#0085db]" />
          <p className="text-sm text-[#5A6A85] mt-2">Xususiyatlar yuklanmoqda...</p>
        </div>
      );
    }

    if (errorDefs) {
      return (
        <div className="py-8 text-center">
          <AlertCircle size={20} className="inline-block text-[#fa896b]" />
          <p className="text-sm text-[#fa896b] mt-2">{errorDefs}</p>
        </div>
      );
    }

    if (!categoryId && variants.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-[#9aa8bb]">
            Avval kategoriya tanlang — xususiyatlar va variantlar yuklanadi.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-base font-bold text-[#2A3547] mb-1">Xususiyatlar</h3>
          <p className="text-sm text-[#7c8fac] mb-3">
            Mahsulotning tavsifiy xususiyatlari — material, brend, mavsum kabi. Xaridor bularni
            tanlamaydi, faqat ma'lumot sifatida ko'radi.
          </p>
          {!categoryId ? (
            <p className="text-sm text-[#9aa8bb] italic">
              Xususiyatlar uchun kategoriya tanlanishi kerak.
            </p>
          ) : (
            <>
              <AttributeFields
                defs={attributeDefs}
                values={values}
                errors={attributeErrors}
                extras={extraValues}
                disabled={disabled}
                onChange={(defId, value) => {
                  setValues((prev) => ({ ...prev, [defId]: value }));
                  setAttributeErrors((prev) => {
                    const next = { ...prev };
                    delete next[defId];
                    return next;
                  });
                }}
              />
              {attributeDefs.length === 0 && (
                <p className="text-sm text-[#9aa8bb] italic">
                  Bu kategoriya uchun xususiyatlar aniqlanmagan.{" "}
                  <a href={`/admin/categories/${categoryId}/attributes`} className="text-[#0085db] font-semibold underline">
                    Kategoriya xususiyatlarini boshqarish
                  </a>
                </p>
              )}
            </>
          )}
        </div>

        <div>
          <h3 className="text-base font-bold text-[#2A3547] mb-1">Variantlar</h3>
          <p className="text-sm text-[#7c8fac] mb-3">
            Xaridor mahsulotni tanlashda qaysi xususiyatlarni tanlashini belgilang. Masalan, rang
            yoki o'lcham.
          </p>
          {variantDefs.length > 0 || variants.length > 0 ? (
            loadingVariants && variants.length === 0 ? (
              <div className="py-4 text-center">
                <Loader2 size={16} className="animate-spin inline-block text-[#0085db]" />
                <span className="text-sm text-[#5A6A85] ml-2">Variantlar yuklanmoqda...</span>
              </div>
            ) : (
              <VariantEditor
                axes={axes}
                onAxesChange={setAxes}
                variants={variants}
                onVariantsChange={setVariants}
                variantDefs={variantDefs}
                deletedKeys={deletedKeys}
                onDeletedKeysChange={setDeletedKeys}
                disabled={disabled}
              />
            )
          ) : (
            <div>
              <p className="text-sm text-[#9aa8bb] italic">
                Variantlar — Bu mahsulot uchun variantlar belgilanmagan.
              </p>
              {categoryId && (
                <p className="text-sm text-[#9aa8bb] italic mt-1">
                  Variant qo'shish uchun kategoriya xususiyatlarida "Variant turi" belgilangan
                  definition kerak.{" "}
                  <a href={`/admin/categories/${categoryId}/attributes`} className="text-[#0085db] font-semibold underline">
                    Kategoriya xususiyatlarini boshqarish
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default UniversalProductSections;