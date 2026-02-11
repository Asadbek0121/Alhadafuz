"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus, X, UploadCloud, Settings, ChevronLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

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
    template: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const tryParseJsonImages = (jsonStr: string) => {
    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed.join('\n');
    } catch (e) { }
    return jsonStr;
};

export default function EditProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
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

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
    });

    useEffect(() => {
        // Fetch Categories
        fetch('/api/admin/categories')
            .then(res => res.json())
            .then(data => setCategories(data));

        // Fetch Product Data
        if (id) {
            fetch(`/api/admin/products/${id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch product");
                    return res.json();
                })
                .then(data => {
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
                        category: data.categoryId || (typeof data.category === 'object' ? data.category?.id : (typeof data.category === 'string' && data.category.length > 20 ? data.category : "")) || "",
                        // For demonstration, mapping some fields even if not perfect match
                        discountType: data.discount ? "fixed_price" : "no_discount",
                        discountValue: data.discount || "",
                        discountCategory: data.discountType || "SALE",
                        brand: data.brand || "",
                        status: (data.status === "ACTIVE" || data.status === "published") ? "published" :
                            (data.status === "inactive" ? "inactive" :
                                (data.status === "sotuvda_kam_qolgan" ? "sotuvda_kam_qolgan" :
                                    (data.status === "draft" || data.status === "DRAFT" ? "draft" : "inactive")))
                    });

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
                            Object.entries(parsedAttrs).forEach(([key, value]) => {
                                attrs.push({ key, value: Array.isArray(value) ? value.join(',') : String(value) });
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

        const payload = {
            ...data,
            price: Number(data.price),
            stock: Number(data.stock),
            oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
            discount: data.discountValue ? Number(data.discountValue) : null,
            discountType: data.discountCategory,
            images: imagesList,
            attributes: attrsObject
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
                                <input id="edit-main-image-upload" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'image')} />
                                <button type="button" onClick={() => document.getElementById('edit-main-image-upload')?.click()} className="btn-light-primary" style={{ marginTop: '10px' }}>Tanlash</button>
                            </div>
                            {watch('image') && (
                                <div style={{ marginTop: '15px', position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                    <img src={watch('image')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                    onClick={() => document.getElementById('edit-gallery-upload')?.click()}
                                    style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#999' }}
                                >
                                    <Plus />
                                </div>
                                <input id="edit-gallery-upload" type="file" hidden accept="image/*" onChange={(e) => handleImageUpload(e, 'images')} />
                            </div>
                        </div>
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
                            <div key={idx} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
                                <input value={attr.key} onChange={(e) => updateAttribute(idx, 'key', e.target.value)} className="input" placeholder="Turi" />
                                <input value={attr.value} onChange={(e) => updateAttribute(idx, 'value', e.target.value)} className="input" placeholder="Qiymati" />
                                <button type="button" onClick={() => removeAttribute(idx)} className="btn-icon-danger"><X size={16} /></button>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                            <button type="button" onClick={addAttribute} className="btn-light-primary">
                                <Plus size={18} style={{ marginRight: '8px' }} /> Xususiyat qo'shish
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

                    {/* Details */}
                    <div className="card">
                        <h2 className="card-title">Mahsulot ma'lumotlari</h2>
                        <div className="form-group">
                            <label className="label">Kategoriya</label>
                            <select {...register("category")} className="input">
                                <option value="">Kategoriyani tanlang</option>
                                {categories.map((cat: any) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.parent ? `${cat.parent.name} > ` : ''}{cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Brand</label>
                            <input {...register("brand")} className="input" placeholder="Brand nomi" />
                        </div>
                        <div className="form-group">
                            <label className="label">Omborda</label>
                            <input {...register("stock")} type="number" className="input" placeholder="Ombordagi soni" />
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
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
        </div>
    );
}
