"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, UploadCloud, Settings, ChevronLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

const productSchema = z.object({
    title: z.string().min(3, "Mahsulot nomi kamida 3 ta belgidan iborat bo'lishi kerak"),
    description: z.string().min(10, "Tavsif kamida 10 ta belgidan iborat bo'lishi kerak"),
    category: z.string().min(1, "Kategoriya tanlang"),
    brand: z.string().optional(),
    price: z.coerce.number().positive("Narx musbat bo'lishi kerak"),
    oldPrice: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.coerce.number().positive().optional()),
    discountType: z.enum(["no_discount", "percentage", "fixed_price"]).default("no_discount"),
    discountValue: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.coerce.number().nonnegative().optional()),
    discountCategory: z.string().default("SALE"),
    vatAmount: z.preprocess((val) => (val === "" || val === null ? undefined : val), z.coerce.number().nonnegative().optional()),
    stock: z.coerce.number().int().nonnegative("Ombordagi soni manfiy bo'lishi mumkin emas").default(0),
    image: z.string().min(1, "Asosiy rasm majburiy"),
    images: z.string().optional(),
    tags: z.string().optional(),
    status: z.enum(["published", "draft", "scheduled", "inactive"]).default("published"),
    isNew: z.boolean().default(true),
    freeDelivery: z.boolean().default(false),
    hasVideo: z.boolean().default(false),
    hasGift: z.boolean().default(false),
    showLowStock: z.boolean().default(false),
    allowInstallment: z.boolean().default(false),
    template: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [bulkText, setBulkText] = useState("");

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

    useEffect(() => {
        fetch('/api/admin/categories')
            .then(res => res.json())
            .then(data => setCategories(data))
            .catch(err => console.error(err));
    }, []);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            title: "",
            description: "",
            price: 0,
            stock: 0,
            category: "",
            isNew: true,
            freeDelivery: false,
            hasVideo: false,
            hasGift: false,
            showLowStock: false,
            allowInstallment: false,
            discountType: "no_discount",
            status: "published"
        }
    });

    // Auto-calculate price based on discount
    const watchOldPrice = watch('oldPrice');
    const watchPrice = watch('price');
    const watchDiscountValue = watch('discountValue');
    const watchDiscountType = watch('discountType');

    const isCalculating = useRef(false);

    useEffect(() => {
        if (isCalculating.current) return;

        if (watchDiscountType === 'no_discount') {
            return;
        }

        isCalculating.current = true;
        const discVal = Number(watchDiscountValue || 0);

        if (watchOldPrice && watchOldPrice > 0) {
            const oldPriceNum = Number(watchOldPrice);
            let calculatedPrice = 0;

            if (watchDiscountType === 'percentage') {
                calculatedPrice = Math.round(oldPriceNum - (oldPriceNum * (discVal / 100)));
            } else if (watchDiscountType === 'fixed_price') {
                calculatedPrice = Math.round(oldPriceNum - discVal);
            }

            if (calculatedPrice !== watchPrice) {
                setValue('price', calculatedPrice);
            }
        } else if (watchPrice && watchPrice > 0 && discVal > 0) {
            const priceNum = Number(watchPrice);
            let calculatedOldPrice = 0;

            if (watchDiscountType === 'percentage') {
                calculatedOldPrice = Math.round(priceNum / (1 - (discVal / 100)));
            } else if (watchDiscountType === 'fixed_price') {
                calculatedOldPrice = Math.round(priceNum + discVal);
            }

            if (calculatedOldPrice !== watchOldPrice) {
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

            // Note: Replace with your actual upload API endpoint
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
                const values = attr.value.split(',').map(s => s.trim()).filter(Boolean);
                if (values.length > 0) {
                    attrsObject[attr.key] = values;
                }
            }
        });

        const categoryIds = data.category?.split(',').filter(Boolean) || [];

        const payload = {
            ...data,
            price: data.price,
            stock: data.stock,
            oldPrice: data.oldPrice || null,
            discount: data.discountValue || null,
            discountType: data.discountCategory || "SALE",
            vatPercent: data.vatAmount || 0,
            images: imagesList,
            attributes: attrsObject,
            category: data.category, // Keep for backward compatibility
            categoryIds // New M-N relation
        };

        try {
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json().catch(() => ({}));

            if (!res.ok) {
                let errorMessage = responseData.error || "Failed to create product";

                // If there are validation details, format them nicely
                if (responseData.details) {
                    const details = responseData.details;
                    const errorFields = Object.keys(details).filter(k => k !== "_errors");
                    if (errorFields.length > 0) {
                        const fieldErrors = errorFields.map(field => {
                            const messages = details[field]._errors || [];
                            return `${field}: ${messages.join(", ")}`;
                        }).join("; ");
                        errorMessage = `Ma'lumotlar xato: ${fieldErrors}`;
                    } else if (details._errors && details._errors.length > 0) {
                        errorMessage = details._errors.join(", ");
                    }
                }

                throw new Error(errorMessage);
            }

            toast.success("Mahsulot muvaffaqiyatli yaratildi");
            router.push("/admin/products");
            router.refresh();
        } catch (error: any) {
            console.error("Submit error details:", error);
            toast.error(error.message || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: "0" }}>
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
                            <p className="helper-text">Mahsulot haqida batafsil ma'lumot bering.</p>
                        </div>
                    </div>

                    {/* Media Section */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Media</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">Asosiy Rasm</label>
                            <div className="upload-zone">
                                <UploadCloud size={40} color="#0085db" />
                                <p style={{ margin: '10px 0', fontSize: '16px', fontWeight: '500' }}>
                                    Faylni tashlang yoki tanlang
                                </p>
                                <p style={{ fontSize: '12px', color: '#999' }}>
                                    Fayllarni shu yerga tashlang yoki kompyuterdan <span style={{ color: '#0085db', cursor: 'pointer' }} onClick={() => document.getElementById('main-image-upload')?.click()}>tanlang</span>
                                </p>
                                <input id="main-image-upload" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} />
                            </div>
                            {watch('image') && (
                                <div style={{ marginTop: '15px', position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                    <img src={watch('image')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => setValue('image', '')} type="button" style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,0,0,0.7)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>&times;</button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="label">Galereya rasmlari</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {watch('images')?.split('\n').filter(Boolean).map((url, i) => (
                                    <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                                <div
                                    onClick={() => document.getElementById('gallery-upload')?.click()}
                                    style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#999' }}
                                >
                                    <Plus />
                                </div>
                                <input id="gallery-upload" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'images')} />
                            </div>
                        </div>
                    </div>

                    {/* Variation Section */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Varyatsiyalar</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>

                        {attributes.map((attr, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '15px', alignItems: 'end', marginBottom: '15px' }}>
                                <div>
                                    <label className="label">Varyatsiya turi</label>
                                    <input value={attr.key} onChange={(e) => updateAttribute(idx, 'key', e.target.value)} className="input" placeholder="Rang, O'lcham..." />
                                </div>
                                <div>
                                    <label className="label">Qiymati</label>
                                    <input value={attr.value} onChange={(e) => updateAttribute(idx, 'value', e.target.value)} className="input" placeholder="Qizil, XL..." />
                                </div>
                                <button type="button" onClick={() => removeAttribute(idx)} className="btn-icon-danger">
                                    <X size={18} />
                                </button>
                            </div>
                        ))}

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button type="button" onClick={addAttribute} className="btn-light-primary">
                                <Plus size={18} style={{ marginRight: '8px' }} /> Varyatsiya qo'shish
                            </button>
                            <button type="button" onClick={() => setShowBulkPaste(!showBulkPaste)} className="btn-light-secondary" style={{ background: '#f0f0f0', color: '#555', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', transition: 'background 0.2s' }}>
                                <Copy size={18} style={{ marginRight: '8px' }} /> Matndan nusxalash
                            </button>
                        </div>

                        {showBulkPaste && (
                            <div style={{ marginTop: '15px', background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e5eaef', animation: 'fadeIn 0.3s' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: '#2A3547' }}>Xususiyatlarni matndan nusxalash</h4>
                                <p style={{ fontSize: '13px', color: '#5A6A85', marginBottom: '15px', lineHeight: '1.5' }}>
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
                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
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

                    {/* Pricing Section */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Narx</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label className="label">Asosiy narx <span className="text-red-500">*</span></label>
                                <input {...register("price")} type="number" className="input" placeholder="Mahsulot narxi" />
                                {errors.price && <span className="error">{errors.price.message}</span>}
                                <p className="helper-text">Mahsulot narxini belgilang.</p>
                            </div>
                            <div className="form-group">
                                <label className="label">Eski narx (optional)</label>
                                <input {...register("oldPrice")} type="number" className="input" placeholder="0" />
                                {errors.oldPrice && <span className="error">{errors.oldPrice.message}</span>}
                                <p className="helper-text">Chegirmadan oldingi narx.</p>
                            </div>
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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {watch('discountType') !== 'no_discount' && (
                                <>
                                    <div className="form-group">
                                        <label className="label">Chegirma miqdori</label>
                                        <input {...register("discountValue")} type="number" className="input" placeholder="0" />
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
                            <label className="label">Soliq (%)</label>
                            <input {...register("vatAmount")} type="number" className="input" placeholder="0" />
                            {errors.vatAmount && <span className="error">{errors.vatAmount.message}</span>}
                            <p className="helper-text">QQS miqdorini belgilang.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Status Section */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Holat</h2>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ceb6' }}></div>
                        </div>
                        <div className="form-group">
                            <label className="label">Mahsulot holati</label>
                            <select {...register("status")} className="input">
                                <option value="published">Nashr qilingan</option>
                                <option value="draft">Qoralama</option>
                                <option value="scheduled">Rejalashtirilgan</option>
                                <option value="inactive">Faol emas</option>
                            </select>
                            <p className="helper-text">Mahsulot holatini belgilang.</p>
                        </div>
                    </div>

                    {/* Product Details Section */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Mahsulot ma'lumotlari</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">Kategoriyalar (bir yoki bir nechta)</label>
                            <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '15px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5eaef' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                    {categories.map((cat: any) => {
                                        const isSelected = watch('category')?.split(',').includes(cat.id);
                                        return (
                                            <label
                                                key={cat.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
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
                            {errors.category && <span className="error">{errors.category.message}</span>}
                            <p className="helper-text">Mahsulotni bir yoki bir nechta kategoriyaga biriktiring.</p>
                            <button type="button" className="btn-light-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
                                <Plus size={16} style={{ marginRight: '5px' }} /> Yangi kategoriya yaratish
                            </button>
                        </div>
                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="label">Brand</label>
                            <input {...register("brand")} className="input" placeholder="Brand nomi" />
                        </div>
                        <div className="form-group">
                            <label className="label">Teglar</label>
                            <input {...register("tags")} className="input" placeholder="Teglarni kiriting..." />
                            <p className="helper-text">Mahsulotga teglar qo'shing.</p>
                        </div>
                    </div>

                    {/* Product Template */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Mahsulot shabloni</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">Shablonni tanlash</label>
                            <select {...register("template")} className="input">
                                <option value="default">Odatiy shablon</option>
                                <option value="box">Box ko'rinishi</option>
                                <option value="full">To'liq kenglik</option>
                            </select>
                            <p className="helper-text">Mahsulot ko'rinish shablonini tanlang.</p>
                        </div>
                    </div>

                    {/* Inventory */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Ombor</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">Ombordagi soni</label>
                            <input {...register("stock")} type="number" className="input" placeholder="0" />
                            {errors.stock && <span className="error">{errors.stock.message}</span>}
                        </div>
                    </div>

                    {/* Marketing */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Marketing</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                                <input type="checkbox" {...register("isNew")} style={{ width: '18px', height: '18px' }} />
                                <span>"YANGI" belgisi</span>
                            </label>
                        </div>
                        <div className="form-group">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                                    <input type="checkbox" {...register("freeDelivery")} style={{ width: '18px', height: '18px' }} />
                                    <span>🚚 Bepul yetkazib berish</span>
                                </label>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                                    <input type="checkbox" {...register("hasVideo")} style={{ width: '18px', height: '18px' }} />
                                    <span>🎬 Video-sharh mavjud</span>
                                </label>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                                    <input type="checkbox" {...register("hasGift")} style={{ width: '18px', height: '18px' }} />
                                    <span>🎁 Sovg'asi bor</span>
                                </label>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                                    <input type="checkbox" {...register("showLowStock")} style={{ width: '18px', height: '18px' }} />
                                    <span>⚠️ "Kam qoldi" (Stock Alert)</span>
                                </label>
                                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                                    <input type="checkbox" {...register("allowInstallment")} style={{ width: '18px', height: '18px' }} />
                                    <span>💰 Bo'lib to'lash</span>
                                </label>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer Actions */}
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                <button type="button" onClick={() => router.back()} className="btn-outline-danger">
                    Bekor qilish
                </button>
                <button type="button" onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={loading}>
                    {loading && <Loader2 className="animate-spin" size={18} style={{ marginRight: "10px" }} />}
                    {loading ? "Saqlanmoqda..." : "Mahsulot qo'shish"}
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
            `}</style>
        </div >
    );
}
