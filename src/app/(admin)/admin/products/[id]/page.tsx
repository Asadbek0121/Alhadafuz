"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus, X, UploadCloud, Settings, ChevronLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import UniversalProductSections, { type UniversalProductRef } from "@/components/admin/product/UniversalProductSections";

const productSchema = z.object({
    title: z.string().min(3, "Product name must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Select a category"),
    brand: z.string().optional(),
    price: z.union([z.string(), z.number()]),
    oldPrice: z.union([z.string(), z.number()]).optional(),
    discountType: z.enum(["no_discount", "percentage", "fixed_price"]).default("no_discount"),
    discountValue: z.union([z.string(), z.number()]).optional(),
    discountCategory: z.string().default("SALE"),
    vatAmount: z.union([z.string(), z.number()]).optional(),
    stock: z.union([z.string(), z.number()]),
    image: z.string().min(1, "Main image is required"),
    images: z.string().optional(),
    tags: z.string().optional(),
    status: z.enum(["published", "draft", "scheduled", "inactive", "sotuvda_kam_qolgan"]).default("published"),
    isNew: z.boolean().default(false),
    freeDelivery: z.boolean().default(false),
    hasVideo: z.boolean().default(false),
    hasGift: z.boolean().default(false),
    showLowStock: z.boolean().default(false),
    allowInstallment: z.boolean().default(false),
    fulfillmentType: z.enum(["LOCAL", "CHINA_ORDER"]).default("LOCAL"),
    template: z.string().optional(),
}).check((ctx) => {
    // Chegirma turi tanlangan bo'lsa, miqdor MAJBURIY — qarang:
    // src/app/(admin)/admin/products/new/page.tsx dagi bir xil tekshiruv.
    const v = ctx.value;
    if (v.discountType !== "no_discount" && !(Number(v.discountValue) > 0)) {
        ctx.issues.push({
            code: "custom",
            message: "Chegirma turi tanlandi — miqdorni kiriting (0 dan katta)",
            path: ["discountValue"],
            input: v.discountValue,
        });
    }
});

type ProductFormValues = z.infer<typeof productSchema>;

const tryParseJsonImages = (jsonStr: string) => {
    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed.join('\n');
    } catch (e) { }
    return jsonStr;
};

/**
 * Saqlangan `discount` foiz sifatida kiritilganmi yoki so'm sifatida —
 * bazada bu ajratilmaydi. Eski narxdan qaytarib hisoblab tekshiramiz:
 * `oldPrice - oldPrice*discount/100` joriy narxga teng chiqsa, bu foiz.
 */
const guessDiscountKind = (
    price: unknown,
    oldPrice: unknown,
    discount: unknown
): "no_discount" | "percentage" | "fixed_price" => {
    const disc = Number(discount || 0);
    if (!disc) return "no_discount";

    const priceNum = Number(price || 0);
    const oldNum = Number(oldPrice || 0);
    if (oldNum > 0 && disc < 100) {
        const asPercent = Math.round(oldNum - oldNum * (disc / 100));
        // 1 so'mlik yaxlitlash farqiga yo'l qo'yamiz
        if (Math.abs(asPercent - priceNum) <= 1) return "percentage";
    }
    return "fixed_price";
};

export default function EditProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
    const [brandId, setBrandId] = useState("");
    const [variantDiff, setVariantDiff] = useState<{ added: string[]; removed: string[]; unchanged: string[] } | null>(null);
    const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [categoryWarning, setCategoryWarning] = useState(false);
    const universalRef = useRef<UniversalProductRef>(null);

    const processBulkPaste = () => {
        if (!bulkText.trim()) return;

        const lines = bulkText.split('\n');
        // Filter out empty existing attributes if needed, but let's append
        const newAttrs = [...attributes.filter(a => a.key || a.value)];
        let addedCount = 0;

        lines.forEach(line => {
            if (!line.trim()) return;

            let key = "";
            let value = "";

            // Try splitting by tab first (Excel copy paste usually uses tabs)
            if (line.includes('\t')) {
                const parts = line.split('\t');
                key = parts[0];
                value = parts.slice(1).join(' ').trim();
            }
            // Then by colon :
            else if (line.includes(':')) {
                const parts = line.split(':');
                key = parts[0];
                value = parts.slice(1).join(':').trim();
            }
            // Then by dash -
            else if (line.includes(' - ')) {
                const parts = line.split(' - ');
                key = parts[0];
                value = parts.slice(1).join(' - ').trim();
            }

            if (key && value) {
                newAttrs.push({ key: key.trim(), value: value.trim() });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            setAttributes(newAttrs);
            setBulkText("");
            setShowBulkPaste(false);
            toast.success(`${addedCount} ta xususiyat qo'shildi`);
        } else {
            toast.error("Format noto'g'ri. Har bir qatorda 'Nomi' va 'Qiymati' bo'lishi kerak");
        }
    };

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
    });

    useEffect(() => {
        // Fetch Categories
        fetch('/api/admin/categories')
            .then(res => res.json())
            .then(data => setCategories(data));

        // Fetch Brands
        fetch('/api/admin/brands')
            .then(res => res.ok ? res.json() : [])
            .then(data => setBrands(Array.isArray(data) ? data : []))
            .catch(() => setBrands([]));

        // Fetch Product Data
        if (id) {
            fetch(`/api/admin/products/${id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch product");
                    return res.json();
                })
                .then(data => {
                    // Handle category IDs (M-N relation)
                    let categoryValue = '';
                    if (data.categories && Array.isArray(data.categories)) {
                        // New M-N relation
                        categoryValue = data.categories.map((c: any) => c.id).join(',');
                    } else if (data.categoryId) {
                        // Old single category
                        categoryValue = data.categoryId;
                    }

                    // Populate Form
                    reset({
                        title: data.title,
                        description: data.description,
                        price: data.price,
                        oldPrice: data.oldPrice,
                        stock: data.stock,
                        image: data.image,
                        // Safely handle images whether it's an array for JSON string
                        images: Array.isArray(data.images)
                            ? data.images.join('\n')
                            : (typeof data.images === 'string' && data.images.startsWith('[')
                                ? tryParseJsonImages(data.images)
                                : (data.images || '')),
                        category: categoryValue,
                        // `discount` ustuni foizmi yoki so'mmi — bazada yozilmaydi,
                        // shuning uchun eski narxdan qaytarib hisoblanadi. Ilgari bu
                        // yerda doim "fixed_price" tanlanardi: 20% chegirmali
                        // mahsulotni tahrirlashga ochishning o'zi avtomatik hisoblash
                        // effektini ishga solib, narxni `oldPrice - 20` ga
                        // aylantirib qo'yardi.
                        discountType: data.discountMethod === "PERCENTAGE" ? "percentage"
                            : data.discountMethod === "FIXED" ? "fixed_price"
                            : guessDiscountKind(data.price, data.oldPrice, data.discount),
                        discountValue: data.discount || "",
                        discountCategory: data.discountType || "SALE",
                        brand: data.brand || "",
                        // Teglar `attributes._tags` ichida saqlanadi, API ularni
                        // yuqori darajaga chiqarib beradi.
                        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ""),
                        status: (data.status === "ACTIVE" || data.status === "published") ? "published" :
                            (data.status === "inactive" ? "inactive" :
                                (data.status === "sotuvda_kam_qolgan" ? "sotuvda_kam_qolgan" :
                                    (data.status === "draft" || data.status === "DRAFT" ? "draft" : "inactive"))),
                        isNew: !!data.isNew,
                        freeDelivery: !!data.freeDelivery,
                        hasVideo: !!data.hasVideo,
                        hasGift: !!data.hasGift,
                        showLowStock: !!data.showLowStock,
                        allowInstallment: !!data.allowInstallment,
                        fulfillmentType: data.fulfillmentType === "CHINA_ORDER" ? "CHINA_ORDER" : "LOCAL",
                    });
                    setBrandId(data.brandId || "");

                    // Populate attributes
                    const attrsSource = data.attributes || data.specs;
                    if (attrsSource) {
                        let parsedAttrs = attrsSource;
                        if (typeof attrsSource === 'string') {
                            try {
                                parsedAttrs = JSON.parse(attrsSource);
                            } catch (e) { }
                        }

                        if (parsedAttrs && typeof parsedAttrs === 'object') {
                            const attrs: any[] = [];
                            const marketingKeys = ['isNew', 'freeDelivery', 'hasVideo', 'hasGift', 'showLowStock', 'allowInstallment'];

                            Object.entries(parsedAttrs).forEach(([key, value]) => {
                                // Filter out marketing flags from technical variations.
                                // `_tags` ham o'tkazib yuboriladi: u teglar maydoniga
                                // yuklanadi, xususiyatlar jadvaliga emas.
                                if (!marketingKeys.includes(key) && key !== '_tags') {
                                    attrs.push({ key, value: Array.isArray(value) ? value.join(',') : String(value) });
                                }
                            });
                            setAttributes(attrs);
                        }
                    }
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Error fetching product");
                })
                .finally(() => setFetching(false));
        }
    }, [id, reset]);

    // Auto-calculate price based on discount
    const watchOldPrice = watch('oldPrice');
    const watchPrice = watch('price');
    const watchDiscountValue = watch('discountValue');
    const watchDiscountType = watch('discountType');

    // Use a ref to prevent infinite loops if we make it bi-directional
    const isCalculating = useRef(false);

    useEffect(() => {
        if (isCalculating.current) return;

        if (watchDiscountType === 'no_discount') {
            return;
        }

        isCalculating.current = true;
        const discVal = Number(watchDiscountValue || 0);

        // Case 1: We have Old Price and want to find final Price
        if (Number(watchOldPrice || 0) > 0) {
            const oldPriceNum = Number(watchOldPrice);
            let calculatedPrice = 0;

            if (watchDiscountType === 'percentage') {
                calculatedPrice = Math.round(oldPriceNum - (oldPriceNum * (discVal / 100)));
            } else if (watchDiscountType === 'fixed_price') {
                calculatedPrice = Math.round(oldPriceNum - discVal);
            }

            if (calculatedPrice !== Number(watchPrice)) {
                setValue('price', calculatedPrice);
            }
        }
        // Case 2: We have final Price and want to find Old Price
        else if (Number(watchPrice || 0) > 0 && discVal > 0) {
            const priceNum = Number(watchPrice);
            let calculatedOldPrice = 0;

            if (watchDiscountType === 'percentage') {
                calculatedOldPrice = Math.round(priceNum / (1 - (discVal / 100)));
            } else if (watchDiscountType === 'fixed_price') {
                calculatedOldPrice = Math.round(priceNum + discVal);
            }

            if (calculatedOldPrice !== Number(watchOldPrice)) {
                setValue('oldPrice', calculatedOldPrice);
            }
        }

        isCalculating.current = false;
    }, [watchOldPrice, watchPrice, watchDiscountValue, watchDiscountType, setValue]);

    const addAttribute = () => {
        setAttributes([...attributes, { key: "", value: "" }]);
    };

    const removeAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
        const newAttrs = [...attributes];
        newAttrs[index][field] = val;
        setAttributes(newAttrs);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'images') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            if (field === 'image') {
                setValue('image', data.url);
            } else {
                const current = watch('images');
                const newValue = current ? current + '\n' + data.url : data.url;
                setValue('images', newValue);
            }
            toast.success("Image uploaded successfully");
        } catch (err) {
            console.error(err);
            toast.error("Failed to upload image");
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    async function onSubmit(data: ProductFormValues) {
        setLoading(true);

        const imagesList = data.images
            ? String(data.images).split('\n').map(s => s.trim()).filter(Boolean)
            : [];
        if (data.image && !imagesList.includes(data.image)) {
            imagesList.unshift(data.image);
        }

        const attrsObject: Record<string, string | string[]> = {};
        attributes.forEach(attr => {
            if (attr.key && attr.value) {
                // Determine if array or string based on commas
                attrsObject[attr.key] = attr.value.split(',').map(s => s.trim());
            }
        });

        // Teglar uchun `Product`da ustun yo'q — `attributes._tags` ichida saqlanadi.
        const tagList = (data.tags || "").split(',').map(s => s.trim()).filter(Boolean);
        if (tagList.length) attrsObject._tags = tagList;

        const categoryIds = data.category?.split(',').filter(Boolean) || [];

        // "Chegirma yo'q" tanlansa ikkala ustun ham tozalanadi. Ilgari
        // `discountType` shartsiz yozilardi (doim "SALE"), shuning uchun bir
        // marta chegirma qo'yilgan mahsulotdan uni olib tashlashning yo'li
        // yo'q edi — sayt kartada chegirmani ko'rsatishda davom etardi.
        const noDiscount = data.discountType === "no_discount";

        const payload = {
            ...data,
            price: Number(data.price),
            stock: Number(data.stock),
            oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
            brandId: brandId || null,
            discount: noDiscount || !data.discountValue ? null : Number(data.discountValue),
            discountType: noDiscount ? null : data.discountCategory,
            discountMethod: noDiscount
                ? null
                : (data.discountType === "percentage" ? "PERCENTAGE" : data.discountType === "fixed_price" ? "FIXED" : "NONE"),
            images: imagesList,
            attributes: attrsObject,
            // Faqat birinchi ID — ilgari butun "id1,id2" qatori yuborilib, server
            // hech qanday kategoriya topmasdi va eski `category` ustuniga ID'lar
            // qatori yozilardi.
            category: categoryIds[0] || data.category,
            categoryIds,
            freeDelivery: data.freeDelivery,
            hasVideo: data.hasVideo,
            hasGift: data.hasGift,
            showLowStock: data.showLowStock,
            allowInstallment: data.allowInstallment,
            fulfillmentType: data.fulfillmentType || "LOCAL",
        };

        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMessage = errorData.error || (errorData.details ? (typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details)) : "Xatolik yuz berdi");
                throw new Error(errorMessage);
            }

            // Structured attributes + variants saqlash (universal format)
            const universalError = universalRef.current?.validate() ?? null;
            if (universalError) {
                toast.error(universalError);
                setLoading(false);
                return;
            }
            const saved = await universalRef.current?.saveAttributesAndVariants(String(id));
            if (!saved) {
                throw new Error("Mahsulot yangilandi, lekin xususiyatlar/variantlar saqlanmadi. Qayta urinib ko'ring.");
            }

            toast.success("Mahsulot muvaffaqiyatli yangilandi");
            router.push("/admin/products");
            router.refresh();
        } catch (error: any) {
            console.error("Update error:", error);
            toast.error(error.message || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    }

    if (fetching) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Loader2 className="animate-spin" /></div>;

    return (
        <div style={{ padding: "0" }}>
            <div style={{ marginBottom: '20px' }}>
                <span style={{ color: '#5A6A85', fontSize: '14px' }}>Mahsulotlar / Mahsulotni tahrirlash</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* General Section */}
                    <div className="card">
                        <h2 className="card-title">Umumiy</h2>
                        <div className="form-group">
                            <label className="label">Mahsulot nomi <span className="text-red-500">*</span></label>
                            <input {...register("title")} className="input" placeholder="Mahsulot nomi" />
                            {errors.title && <span className="error">{errors.title.message}</span>}
                            <p className="helper-text">Mahsulot nomi majburiy va takrorlanmas bo'lishi tavsiya etiladi.</p>
                        </div>
                        <div className="form-group">
                            <label className="label">Tavsif</label>
                            <textarea {...register("description")} className="input" rows={6} placeholder="Mahsulot tavsifi..." />
                            {errors.description && <span className="error">{errors.description.message}</span>}
                        </div>
                    </div>

                    {/* Media Section */}
                    <div className="card">
                        <div className="flex-between-center">
                            <h2 className="card-title">Media</h2>
                            <button type="button" className="fab-green" title="Media sozlamalari" aria-label="Media sozlamalari"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">Asosiy Rasm</label>
                            <div className="upload-zone">
                                <UploadCloud size={40} color="#0085db" />
                                <p className="mt-2 text-base font-medium">
                                    Faylni tashlang yoki tanlang
                                </p>
                                <input id="edit-main-image-upload" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} />
                                <button type="button" onClick={() => document.getElementById('edit-main-image-upload')?.click()} className="btn-light-primary" style={{ marginTop: '10px' }}>Tanlash</button>
                            </div>
                            {watch('image') && (
                                <div className="image-preview-container">
                                    <img alt="Rasm" src={watch('image')} className="image-full" />
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="label">Galereya rasmlari</label>
                            <div className="flex-gap-10 flex-wrap">
                                {watch('images')?.split('\n').filter(Boolean).map((url, i) => (
                                    <div key={i} className="gallery-item">
                                        <img alt="Rasm" src={url} className="image-full" />
                                    </div>
                                ))}
                                <div
                                    onClick={() => document.getElementById('edit-gallery-upload')?.click()}
                                    className="gallery-add"
                                >
                                    <Plus />
                                </div>
                                <input id="edit-gallery-upload" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'images')} />
                            </div>
                        </div>
                    </div>

                    {/* Universal product sections (dynamic attributes + variants) */}
                    <div className="card">
                        <h2 className="card-title">Dinamik xususiyatlar va variantlar</h2>
                        <>
                            {categoryWarning && (
                                <div style={{ background: '#fff6e6', border: '1px solid #ffe0a6', color: '#8a5200', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
                                    Kategoriya o'zgartirilmoqda. Ba'zi xususiyatlar mos kelmasligi mumkin.
                                </div>
                            )}
                            <UniversalProductSections
                                ref={universalRef}
                                productId={String(id)}
                                categoryId={watch('category')?.split(',').filter(Boolean)[0] || null}
                                onCategoryWarning={setCategoryWarning}
                                disabled={loading}
                                onVariantsChange={() => {
                                    // Diff preview — variantlar o'zgarganda yangilanadi
                                    const diff = universalRef.current?.getVariantDiff();
                                    if (diff) setVariantDiff(diff);
                                }}
                            />

                            {/* Variant diff preview — faqat edit rejimida, o'zgarish bo'lsa */}
                            {variantDiff && (variantDiff.added.length > 0 || variantDiff.removed.length > 0) && (
                                <div className="variant-diff-preview">
                                    <h4 className="variant-diff-title">Variant o'zgarishlari</h4>
                                    {variantDiff.added.length > 0 && (
                                        <p className="variant-diff-line"><span className="badge badge-add">+</span> {variantDiff.added.length} ta qo'shiladi: {variantDiff.added.slice(0, 5).join(", ")}{variantDiff.added.length > 5 ? "..." : ""}</p>
                                    )}
                                    {variantDiff.removed.length > 0 && (
                                        <p className="variant-diff-line"><span className="badge badge-remove">−</span> {variantDiff.removed.length} ta o'chiriladi: {variantDiff.removed.slice(0, 5).join(", ")}{variantDiff.removed.length > 5 ? "..." : ""}</p>
                                    )}
                                </div>
                            )}
                        </>
                    </div>

                    {/* Pricing Section */}
                    <div className="card">
                        <h2 className="card-title">Narx</h2>
                        <div className="form-group">
                            <label className="label">Asosiy narx <span className="text-red-500">*</span></label>
                            <input {...register("price")} type="number" className="input" placeholder="Mahsulot narxi" />
                        </div>

                        <div className="form-group">
                            <label className="label">Chegirma turi</label>
                            <div style={{ display: 'flex', gap: '20px', margin: '10px 0' }}>
                                <label className="radio-label">
                                    <input type="radio" value="no_discount" {...register("discountType")} /> Chegirma yo'q
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="percentage" {...register("discountType")} /> Foiz (%)
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="fixed_price" {...register("discountType")} /> Aniq narx
                                </label>
                            </div>
                        </div>

                        <div className="grid-2">
                            {watch('discountType') !== 'no_discount' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Chegirma miqdori</label>
                                        <input {...register("discountValue")} type="number" className={`input ${errors.discountValue ? "invalid" : ""}`} placeholder="0" />
                                        {errors.discountValue && <span className="error">{errors.discountValue.message}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="label">Chegirma kategoriyasi (Dostavka uchun)</label>
                                        <select {...register("discountCategory")} className="input">
                                            <option value="SALE">Aksiya (SALE)</option>
                                            <option value="PROMO">Promo (PROMO)</option>
                                            <option value="HOT">Qaynoq (HOT)</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="label">Eski narx</label>
                            <input {...register("oldPrice")} type="number" className="input" placeholder="Eski narx" />
                            <p className="helper-text">Chegirmadan oldingi narx (ko'rgazma uchun).</p>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Status */}
                    <div className="card">
                        <h2 className="card-title">Holat</h2>
                        <div className="form-group">
                            <label className="label">Mahsulot holati</label>
                            <select {...register("status")} className="input">
                                <option value="published">Sotuvda mavjud</option>
                                <option value="inactive">Sotuvda mavjud emas</option>
                                <option value="sotuvda_kam_qolgan">Sotuvda kam qolgan</option>
                                <option value="draft">Qoralama</option>
                            </select>
                        </div>
                    </div>

                    {/* Attributes */}
                    <div className="card">
                        <h2 className="card-title">Varyatsiyalar (Xususiyatlar)</h2>
                        {attributes.map((attr, idx) => (
                            <div key={idx} className="flex-gap-10 mb-2">
                                <input value={attr.key} onChange={(e) => updateAttribute(idx, 'key', e.target.value)} className="input" placeholder="Turi" />
                                <input value={attr.value} onChange={(e) => updateAttribute(idx, 'value', e.target.value)} className="input" placeholder="Qiymati" />
                                <button type="button" onClick={() => removeAttribute(idx)} className="btn-icon-danger" title="O'chirish" aria-label="Varyatsiyani o'chirish"><X size={16} /></button>
                            </div>
                        ))}
                        <div className="flex-gap-10 flex-wrap mt-2 items-center">
                            <button type="button" onClick={addAttribute} className="btn-light-primary">
                                <Plus size={18} style={{ marginRight: '8px' }} /> Xususiyat qo'shish
                            </button>
                            <button type="button" onClick={() => setShowBulkPaste(!showBulkPaste)} className="btn-light-secondary" style={{ background: '#f0f0f0', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', transition: 'background 0.2s' }}>
                                <Copy size={18} style={{ marginRight: '8px' }} /> Matndan nusxalash
                            </button>
                        </div>

                        {showBulkPaste && (
                            <div className="bulk-paste-box">
                                <h4 className="bulk-paste-title">Xususiyatlarni matndan nusxalash</h4>
                                <p className="bulk-paste-desc">
                                    Excel yoki boshqa saytdan nusxalab tashlang. Har bir qator yangi xususiyat bo'ladi.
                                    <br />Format: <b>Nomi [Tab] Qiymati</b> yoki <b>Nomi: Qiymati</b>
                                </p>
                                <textarea
                                    className="input"
                                    rows={8}
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={`Masalan:\nRang\tQizil\nO'lcham\tXL\nMaterial: Paxta`}
                                    style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5' }}
                                />
                                <div className="flex-gap-10 mt-4">
                                    <button type="button" onClick={processBulkPaste} className="btn-primary">
                                        Qo'shish
                                    </button>
                                    <button type="button" onClick={() => { setShowBulkPaste(false); setBulkText(""); }} className="btn-outline-danger" style={{ border: 'none', padding: '10px 20px' }}>
                                        Yopish
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="card">
                        <h2 className="card-title">Mahsulot ma'lumotlari</h2>
                        <div className="form-group">
                            <label className="label">Kategoriyalar (bir yoki bir nechta)</label>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e5eaef' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                    {categories.map((cat: any) => {
                                        const isSelected = watch('category')?.split(',').includes(cat.id);
                                        return (
                                            <label
                                                key={cat.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 10px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? '#ecf2ff' : '#fff',
                                                    border: isSelected ? '1px solid #0085db' : '1px solid #e5eaef',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: isSelected ? 600 : 500,
                                                    color: isSelected ? '#0085db' : '#5A6A85'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const current = watch('category')?.split(',').filter(Boolean) || [];
                                                        const next = e.target.checked
                                                            ? [...current, cat.id]
                                                            : current.filter(id => id !== cat.id);
                                                        setValue('category', next.join(','));
                                                    }}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                <span>{cat.parent ? `${cat.parent.name} > ` : ''}{cat.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Brand</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select
                                    value={brandId}
                                    onChange={(e) => { setBrandId(e.target.value); setValue("brand", ""); }}
                                    className="input flex-1"
                                >
                                    <option value="">Brend tanlash...</option>
                                    {brands.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                    <option value="__new__">+ Yangi brend nomi yozish</option>
                                </select>
                                <input
                                    {...register("brand")}
                                    className="input flex-1"
                                    placeholder="yoki brend nomini yozing"
                                    onChange={(e) => { setBrandId(""); setValue("brand", e.target.value); }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="label">Teglar</label>
                            <input {...register("tags")} className="input" placeholder="kitob, tarix, sovg'a" />
                            <p style={{ fontSize: '12px', color: '#7c8fac', margin: '6px 0 0' }}>
                                Vergul bilan ajrating. Teglar mahsulot sahifasining SEO kalit so'zlariga aylanadi.
                            </p>
                        </div>
                        <div className="form-group">
                            <label className="label">Sotuv turi</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label className="checkbox-label font-normal">
                                    <input type="radio" value="LOCAL" {...register("fulfillmentType")} className="checkbox-input" />
                                    <span>Oddiy mahsulot</span>
                                </label>
                                <label className="checkbox-label font-normal">
                                    <input type="radio" value="CHINA_ORDER" {...register("fulfillmentType")} className="checkbox-input" />
                                    <span>🇨🇳 Xitoydan buyurtma</span>
                                </label>
                            </div>
                            {watch('fulfillmentType') === 'CHINA_ORDER' && (
                                <p className="helper-text" style={{ color: '#b91c1c' }}>
                                    🇨🇳 Narx 100% oldindan to'lanadi. Kargo mahsulot kelgach alohida hisoblanadi.
                                </p>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="label">Omborda</label>
                            <input {...register("stock")} type="number" className="input" placeholder="Ombordagi soni" />
                        </div>
                        <div className="form-group">
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                <input type="checkbox" {...register("isNew")} style={{ width: '18px', height: '18px' }} />
                                <span>"YANGI" belgisi (New Arrival)</span>
                            </label>
                            <p className="helper-text">Agar tanlansa, mahsulot kartasida "YANGI" yozuvi paydo bo'ladi.</p>
                        </div>

                        <div className="form-group">
                            <h3 className="bulk-paste-title">Marketing belgilari</h3>
                            <div className="grid-1">
                                <label className="checkbox-label font-normal">
                                    <input type="checkbox" {...register("freeDelivery")} className="checkbox-input" />
                                    <span>🚚 Bepul yetkazib berish</span>
                                </label>
                                <label className="checkbox-label font-normal">
                                    <input type="checkbox" {...register("hasVideo")} className="checkbox-input" />
                                    <span>🎬 Video-sharh mavjud</span>
                                </label>
                                <label className="checkbox-label font-normal">
                                    <input type="checkbox" {...register("hasGift")} className="checkbox-input" />
                                    <span>🎁 Sovg'asi bor / 1+1</span>
                                </label>
                                <label className="checkbox-label font-normal">
                                    <input type="checkbox" {...register("showLowStock")} className="checkbox-input" />
                                    <span>⚠️ "Sotuvda juda kam qoldi" (Stock Alert)</span>
                                </label>
                                <label className="checkbox-label font-normal">
                                    <input type="checkbox" {...register("allowInstallment")} className="checkbox-input" />
                                    <span>💰 Bo'lib to'lash (Monthly Payment)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="footer-actions">
                <button type="button" onClick={() => router.back()} className="btn-outline-danger">Bekor qilish</button>
                <button type="button" onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={loading}>
                    {loading ? "Yangilanmoqda..." : "Yangilash"}
                </button>
            </div>

            <style jsx>{`
                .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 0 20px rgba(0,0,0,0.03); margin-bottom: 0px; }
                .card-title { font-size: 18px; font-weight: 700; color: #2A3547; margin-bottom: 20px; margin-top: 0; }
                .form-group { margin-bottom: 20px; }
                .label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #2A3547; }
                .input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #e5eaef; outline: none; font-size: 14px; transition: all 0.2s; color: #5A6A85; }
                .input:focus { border-color: #0085db; }
                .helper-text { font-size: 12px; color: #7c8fac; margin-top: 6px; }
                .error { font-size: 12px; color: #fa896b; margin-top: 4px; display: block; }
                .input.invalid { border-color: #fa896b; background: #fff8f6; }
                .text-red-500 { color: #fa896b; }
                
                .fab-green { width: 35px; height: 35px; border-radius: 50%; background: #e6fffa; color: #00ceb6; border: none; display: flex; alignItems: 'center'; justify-content: center; cursor: pointer; }
                
                .upload-zone { border: 2px dashed #e5eaef; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: border-color 0.2s; display: flex; flex-direction: column; alignItems: center; }
                .upload-zone:hover { border-color: #0085db; }

                .btn-light-primary { background: #ecf2ff; color: #0085db; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; alignItems: center; font-size: 14px; transition: background 0.2s; }
                .btn-light-primary:hover { background: #dfe9ff; }

                .btn-icon-danger { width: 40px; height: 40px; background: #fdede8; color: #fa896b; border: none; border-radius: 8px; display: flex; alignItems: center; justifyContent: center; cursor: pointer; }
                .radio-label { display: flex; items-center: center; gap: 8px; font-size: 14px; color: #5A6A85; cursor: pointer; }
                .btn-primary { background: #0085db; color: #fff; padding: 12px 24px; border-radius: 8px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; alignItems: center; box-shadow: 0 4px 12px rgba(0, 133, 219, 0.2); }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-outline-danger { background: transparent; color: #fa896b; border: 1px solid #fa896b; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
                .btn-outline-danger:hover { background: #fdede8; }
                
                .flex-between-center { display: flex; justify-content: space-between; align-items: center; }
                .flex-gap-10 { display: flex; gap: 10px; }
                .flex-gap-20 { display: flex; gap: 20px; }
                .flex-wrap { flex-wrap: wrap; }
                .flex-col { display: flex; flex-direction: column; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .grid-1 { display: grid; grid-template-columns: 1fr; gap: 8px; }
                
                .image-preview-container { position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; margin-top: 15px; }
                .gallery-item { position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; }
                .gallery-add { width: 80px; height: 80px; border-radius: 8px; border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #999; }
                .image-full { width: 100%; height: 100%; object-fit: cover; }
                
                .bulk-paste-box { margin-top: 15px; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e5eaef; animation: fadeIn 0.3s; }
                .bulk-paste-title { margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #2A3547; }
                .bulk-paste-desc { font-size: 13px; color: #5A6A85; marginBottom: 15px; lineHeight: 1.5; }
                
                .category-list-container { maxHeight: 200px; overflow-y: auto; padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e5eaef; }
                .category-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 13px; }
                .category-item.selected { background: #ecf2ff; border: 1px solid #0085db; font-weight: 600; color: #0085db; }
                .category-item.unselected { background: #fff; border: 1px solid #e5eaef; font-weight: 500; color: #5A6A85; }
                
                .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
                .checkbox-input { width: 18px; height: 18px; cursor: pointer; }
                
                .footer-actions { margin-top: 30px; display: flex; justify-content: flex-end; gap: 15px; }

            `}</style>
        </div>
    );
}
