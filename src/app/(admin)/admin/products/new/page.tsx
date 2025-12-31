"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, UploadCloud, Settings, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

const productSchema = z.object({
    title: z.string().min(3, "Product name must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Select a category"),
    price: z.union([z.string(), z.number()]),
    oldPrice: z.union([z.string(), z.number()]).optional(),
    discountType: z.enum(["no_discount", "percentage", "fixed_price"]).default("no_discount"),
    discountValue: z.union([z.string(), z.number()]).optional(),
    vatAmount: z.union([z.string(), z.number()]).optional(),
    stock: z.union([z.string(), z.number()]),
    image: z.string().min(1, "Main image is required"),
    images: z.string().optional(),
    tags: z.string().optional(),
    status: z.enum(["published", "draft", "scheduled", "inactive"]).default("published"),
    template: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);

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
            price: "",
            stock: "",
            category: "",
            discountType: "no_discount",
            status: "published"
        }
    });

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
                attrsObject[attr.key] = attr.value.split(',').map(s => s.trim());
            }
        });

        // Calculate final price based on discount logic if needed, or store raw values
        // For now mapping to existing schema structure
        const payload = {
            ...data,
            price: Number(data.price),
            stock: Number(data.stock),
            oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
            // Mapping schema fields
            discount: data.discountValue ? Number(data.discountValue) : null,
            images: imagesList,
            attributes: attrsObject,
            category: data.category
        };

        try {
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details ? JSON.stringify(errorData.details) : "Failed to create product");
            }

            toast.success("Product created successfully");
            router.push("/admin/products");
            router.refresh();
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.message || "Something went wrong");
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

                        <button type="button" onClick={addAttribute} className="btn-light-primary">
                            <Plus size={18} style={{ marginRight: '8px' }} /> Varyatsiya qo'shish
                        </button>
                    </div>

                    {/* Pricing Section */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Narx</h2>
                            <button type="button" className="fab-green"><Settings size={20} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">Asosiy narx <span className="text-red-500">*</span></label>
                            <input {...register("price")} type="number" className="input" placeholder="Mahsulot narxi" />
                            {errors.price && <span className="error">{errors.price.message}</span>}
                            <p className="helper-text">Mahsulot narxini belgilang.</p>
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
                                <div className="form-group">
                                    <label className="label">Chegirma miqdori</label>
                                    <input {...register("discountValue")} type="number" className="input" placeholder="0" />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="label">Soliq (%)</label>
                                <input {...register("vatAmount")} type="number" className="input" placeholder="0" />
                                <p className="helper-text">QQS miqdorini belgilang.</p>
                            </div>
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
                            <label className="label">Kategoriyalar</label>
                            <select {...register("category")} className="input">
                                <option value="">Kategoriyani tanlang</option>
                                {categories.map((cat: any) => (
                                    <option key={cat.id} value={cat.slug || cat.id}>
                                        {cat.parent ? `${cat.parent.name} > ` : ''}{cat.name}
                                    </option>
                                ))}
                            </select>
                            <p className="helper-text">Mahsulotni kategoriyaga biriktiring.</p>
                            <button type="button" className="btn-light-primary" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}>
                                <Plus size={16} style={{ marginRight: '5px' }} /> Yangi kategoriya yaratish
                            </button>
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
        </div>
    );
}
