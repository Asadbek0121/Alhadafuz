
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const productSchema = z.object({
    title: z.string().min(3, "Nom kamida 3 ta harf bo'lishi kerak"),
    price: z.coerce.number().min(0, "Narx manfiy bo'lishi mumkin emas"),
    oldPrice: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().min(0, "Stok manfiy bo'lishi mumkin emas"),
    category: z.string().min(1, "Kategoriya tanlang"),
    description: z.string().min(10, "Tavsif kamida 10 ta harf"),
    image: z.string().url("Asosiy rasm URL bo'lishi kerak"),
    images: z.string().optional(),
    status: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductForm({ product }: { product: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [uploading, setUploading] = useState(false);

    // Initialize attributes and fetch categories
    useEffect(() => {
        // Fetch Categories
        fetch('/api/admin/categories')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCategories(data);
            })
            .catch(err => console.error("Error fetching categories", err));

        if (product.attributes) {
            try {
                const parsed = JSON.parse(product.attributes);
                const initAttrs = Object.entries(parsed).map(([key, value]) => ({
                    key,
                    value: Array.isArray(value) ? value.join(', ') : String(value)
                }));
                setAttributes(initAttrs);
            } catch (e) {
                console.error("Failed to parse attributes", e);
            }
        }
    }, [product]);

    // Prepare default values
    let defaultImagesStr = "";
    if (product.images) {
        try {
            const parsed = JSON.parse(product.images);
            if (Array.isArray(parsed)) defaultImagesStr = parsed.join('\n');
            else defaultImagesStr = String(parsed);
        } catch (e) { defaultImagesStr = ""; }
    }

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            title: product.title,
            price: product.price,
            oldPrice: product.oldPrice,
            discount: product.discount,
            stock: product.stock,
            category: product.categoryId || (typeof product.category === 'string' && product.category.length > 20 ? product.category : ""),
            description: product.description,
            image: product.image,
            images: defaultImagesStr,
            status: product.status
        }
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'images') => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok) {
                if (field === 'image') {
                    setValue('image', data.url);
                } else {
                    // Append to textarea (simple logic)
                    const current = document.querySelector<HTMLTextAreaElement>('textarea[name="images"]')?.value || "";
                    setValue('images', current ? current + '\n' + data.url : data.url);
                }
                toast.success("Rasm yuklandi");
            } else {
                toast.error("Yuklashda xatolik");
            }
        } catch (e) {
            toast.error("Xatolik");
        } finally {
            setUploading(false);
        }
    };

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

    async function onSubmit(data: ProductFormValues) {
        setLoading(true);

        const imagesList = data.images
            ? data.images.split('\n').map(s => s.trim()).filter(Boolean)
            : [];

        const attrsObject: Record<string, string | string[]> = {};
        attributes.forEach(attr => {
            if (attr.key && attr.value) {
                if (attr.value.includes(',')) {
                    attrsObject[attr.key] = attr.value.split(',').map(s => s.trim());
                } else {
                    attrsObject[attr.key] = attr.value;
                }
            }
        });

        const payload = {
            ...data,
            images: imagesList,
            attributes: attrsObject
        };

        try {
            const res = await fetch(`/api/admin/products/${product.id}/edit`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.details || "Failed to update");
            }

            toast.success("Mahsulot muvaffaqiyatli yangilandi");
            router.push("/admin/products");
            router.refresh();
        } catch (error: any) {
            console.error("Update Error:", error);
            toast.error(error.message || "Xatolik yuz berdi");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Title */}
            <div>
                <label className="label">Mahsulot nomi</label>
                <input {...register("title")} className="input-field" placeholder="Masalan: iPhone 15 Pro" />
                {errors.title && <span className="error">{errors.title.message}</span>}
            </div>

            {/* Pricing Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                <div>
                    <label className="label">Narxi (so'm)</label>
                    <input {...register("price")} type="number" className="input-field" placeholder="12000000" />
                    {errors.price && <span className="error">{errors.price.message}</span>}
                </div>
                <div>
                    <label className="label">Eski narx (ixtiyoriy)</label>
                    <input {...register("oldPrice")} type="number" className="input-field" placeholder="15000000" />
                </div>
                <div>
                    <label className="label">Chegirma/Foyda (so'm)</label>
                    <input {...register("discount")} type="number" className="input-field" placeholder="3000000" />
                </div>
            </div>

            {/* Stock, Status, Category */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                <div>
                    <label className="label">Ombordagi soni</label>
                    <input {...register("stock")} type="number" className="input-field" />
                    {errors.stock && <span className="error">{errors.stock.message}</span>}
                </div>
                <div>
                    <label className="label">Holati</label>
                    <select {...register("status")} className="input-field" style={{ background: "#fff" }}>
                        <option value="ACTIVE">Faol</option>
                        <option value="DRAFT">Qoralama</option>
                        <option value="ARCHIVED">Arxiv</option>
                    </select>
                </div>
                <div>
                    <label className="label">Kategoriya</label>
                    <select {...register("category")} className="input-field" style={{ background: "#fff" }}>
                        <option value="">Tanlang...</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                        {/* Fallback to simple values if no categories loaded yet or mix */}
                        {!categories.length && (
                            <>
                                <option value="phone">Telefonlar</option>
                                <option value="laptop">Noutbuklar</option>
                                <option value="audio">Audio</option>
                                <option value="accessories">Aksessuarlar</option>
                                <option value="apple">Apple</option>
                            </>
                        )}
                    </select>
                    {errors.category && <span className="error">{errors.category.message}</span>}
                </div>
            </div>

            {/* Images */}
            <div>
                <label className="label">Asosiy Rasm URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input {...register("image")} className="input-field" placeholder="https://..." style={{ flex: 1 }} />
                    <label style={{
                        padding: '0 15px', background: '#f0f9ff', color: '#0066cc',
                        border: '1px solid #bae6fd', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '5px', fontSize: '13px'
                    }}>
                        {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                        Yuklash
                        <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                    </label>
                </div>
                {errors.image && <span className="error">{errors.image.message}</span>}
            </div>

            <div>
                <label className="label">Qo'shimcha Rasmlar (har bir qatorda bittadan URL)</label>
                <textarea {...register("images")} rows={4} className="input-field" placeholder="https://...\nhttps://..." />
                <div style={{ marginTop: '5px' }}>
                    <label style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px',
                        cursor: 'pointer', color: '#0066cc'
                    }}>
                        <UploadCloud size={16} /> Rasmni yuklab ro'yxatga qo'shish
                        <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'images')} />
                    </label>
                </div>
            </div>

            {/* Attributes */}
            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label className="label" style={{ marginBottom: 0 }}>Xususiyatlar</label>
                    <button type="button" onClick={addAttribute} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 10px', background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        <Plus size={14} /> Qo'shish
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {attributes.map((attr, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px' }}>
                            <input
                                placeholder="Nomi (masalan: Rang)"
                                value={attr.key}
                                onChange={(e) => updateAttribute(index, 'key', e.target.value)}
                                className="input-field"
                                style={{ flex: 1 }}
                            />
                            <input
                                placeholder="Qiymati (Qizil, Ko'k)"
                                value={attr.value}
                                onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                                className="input-field"
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={() => removeAttribute(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '0 10px', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="label">Tavsif</label>
                <textarea {...register("description")} rows={6} className="input-field" placeholder="Mahsulot haqida batafsil..." />
                {errors.description && <span className="error">{errors.description.message}</span>}
            </div>

            <button
                type="submit"
                disabled={loading}
                style={{
                    padding: "12px",
                    background: loading ? "#94c3f0" : "#0066cc",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                {loading && <Loader2 className="animate-spin" size={18} style={{ marginRight: "10px" }} />}
                {loading ? "Saqlanmoqda..." : "Yangilash"}
            </button>

            <style jsx>{`
                .label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; }
                .input-field { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; outline: none; transition: border-color 0.2s; }
                .input-field:focus { border-color: #0066cc; }
                .error { font-size: 12px; color: #ef4444; margin-top: 4px; display: block; }
            `}</style>
        </form>
    );
}
