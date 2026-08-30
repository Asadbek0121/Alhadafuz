"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2, Plus, X, UploadCloud, ChevronLeft, ChevronDown, Copy,
    Search, Star, Trash2, AlertCircle, Link2, FolderPlus
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import UniversalProductSections, { type UniversalProductRef } from "@/components/admin/product/UniversalProductSections";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
    // Serverdagi sxema `vatPercent`ni 0..100 bilan cheklaydi — bu yerda ham
    // shu chegara qo'yiladi, aks holda 400 xatosi faqat saqlashda ko'rinadi.
    vatAmount: z.preprocess(
        (val) => (val === "" || val === null ? undefined : val),
        z.coerce.number().min(0, "Soliq manfiy bo'lishi mumkin emas").max(100, "Soliq 100% dan oshmasligi kerak").optional()
    ),
    // Serverga mos: butun songa yaxlitlanadi, keyin manfiy emasligi tekshiriladi.
    stock: z.preprocess(
        (val) => (val === "" || val === null ? 0 : val),
        z.coerce.number().transform((v) => Math.round(v)).pipe(z.number().nonnegative("Ombordagi soni manfiy bo'lishi mumkin emas"))
    ).default(0),
    image: z.string().min(1, "Asosiy rasm majburiy"),
    images: z.string().optional(),
    tags: z.string().optional(),
    mxikCode: z.string().optional(),
    packageCode: z.string().optional(),
    // "scheduled" olib tashlandi: rejalashtirish uchun na sana maydoni,
    // na fon vazifasi bor edi — tanlangan mahsulot shunchaki yo'qolardi.
    status: z.enum(["published", "draft", "inactive"]).default("draft"),
    fulfillmentType: z.enum(["LOCAL", "CHINA_ORDER"]).default("LOCAL"),
    isNew: z.boolean().default(false),
    freeDelivery: z.boolean().default(false),
    hasVideo: z.boolean().default(false),
    hasGift: z.boolean().default(false),
    showLowStock: z.boolean().default(false),
    allowInstallment: z.boolean().default(false),
}).check((ctx) => {
    // Chegirma turi tanlangan bo'lsa, miqdor MAJBURIY. Ilgari bu maydon
    // ixtiyoriy edi: admin "Foiz (%)" ni tanlab qiymatni bo'sh qoldirsa,
    // bazaga `discount: null` tushardi va saytda chegirma jimgina ko'rinmasdi.
    // Sayt chegirmani faqat `discount` ustuni bo'yicha aniqlaydi
    // (`src/lib/product-discount.ts`), shuning uchun bo'sh qiymatga yo'l yo'q.
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

const FIELD_LABELS: Record<string, string> = {
    title: "Mahsulot nomi",
    description: "Tavsif",
    category: "Kategoriya",
    price: "Asosiy narx",
    oldPrice: "Eski narx",
    discountValue: "Chegirma miqdori",
    vatAmount: "Soliq",
    stock: "Ombordagi soni",
    image: "Asosiy rasm",
};

/** Yig'iladigan karta. Sahifa komponenti ichida e'lon qilinmaydi — aks holda har
 *  bir renderda qayta yaratilib, ichidagi inputlar fokusni yo'qotardi.
 *  Karta "chrome"i uchun uslublar shu yerda: styled-jsx uslublarni faqat
 *  `<style jsx>` yozilgan komponent elementlariga bog'laydi. */
function Card({
    title, open, onToggle, children, id, right,
}: {
    title: string;
    open?: boolean;
    onToggle?: () => void;
    children: React.ReactNode;
    id?: string;
    right?: React.ReactNode;
}) {
    const collapsible = typeof onToggle === "function";
    const isOpen = collapsible ? !!open : true;

    return (
        <div className="card" id={id}>
            <div className="card-head">
                <h2 className="card-title">{title}</h2>
                {collapsible ? (
                    <button
                        type="button"
                        className={`card-toggle ${isOpen ? "" : "closed"}`}
                        onClick={onToggle}
                        title={isOpen ? "Bo'limni yopish" : "Bo'limni ochish"}
                        aria-label={isOpen ? "Bo'limni yopish" : "Bo'limni ochish"}
                        aria-expanded={isOpen}
                    >
                        <ChevronDown size={18} />
                    </button>
                ) : right}
            </div>
            {isOpen && <div className="card-body">{children}</div>}

            <style jsx>{`
                .card { background: #fff; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.03); }
                .card-head {
                    display: flex; justify-content: space-between; align-items: center;
                    gap: 12px; padding: 20px 24px;
                }
                .card-body { padding: 0 24px 24px; }
                .card-title { font-size: 17px; font-weight: 700; color: #2A3547; margin: 0; }
                .card-toggle {
                    flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
                    background: #f4f7fb; color: #5A6A85; border: none; display: flex;
                    align-items: center; justify-content: center; cursor: pointer;
                    transition: transform 0.2s, background 0.2s;
                }
                .card-toggle:hover { background: #e7eef7; color: #0085db; }
                .card-toggle.closed { transform: rotate(-90deg); }

                @media (max-width: 640px) {
                    .card-head { padding: 16px; }
                    .card-body { padding: 0 16px 16px; }
                }
            `}</style>
        </div>
    );
}

const isImageUrl = (s: string) =>
    /^https?:\/\/[^\s]+$/i.test(s) &&
    (/\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i.test(s) ||
        /(res\.cloudinary\.com|\.public\.blob\.vercel-storage\.com|googleusercontent\.com|i\.imgur\.com)/i.test(s));

const isTypingTarget = (el: EventTarget | null) => {
    const node = el as HTMLElement | null;
    if (!node || !node.tagName) return false;
    const tag = node.tagName.toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || node.isContentEditable;
};

export default function AddProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(0);
    const [categories, setCategories] = useState<any[]>([]);
    const [catState, setCatState] = useState<"loading" | "ready" | "error">("loading");
    // Brand entity ro'yxati — brandId select uchun
    const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
    const [brandId, setBrandId] = useState("");
    const [catQuery, setCatQuery] = useState("");
    const [showNewCategory, setShowNewCategory] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [newCatParent, setNewCatParent] = useState("");
    const [creatingCat, setCreatingCat] = useState(false);
    const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [dragZone, setDragZone] = useState<"main" | "gallery" | null>(null);
    const [pasteZone, setPasteZone] = useState<"main" | "gallery" | null>(null);
    const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);
    const [createdId, setCreatedId] = useState<string | null>(null);
    const [categoryWarning, setCategoryWarning] = useState(false);
    const universalRef = useRef<UniversalProductRef>(null);
    const [open, setOpen] = useState<Record<string, boolean>>({
        general: true, media: true, variations: true, pricing: true,
        status: true, details: true, fiscal: false, inventory: true, marketing: true, fulfillment: true,
    });

    const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

    const {
        register, handleSubmit, setValue, watch, formState: { errors, isSubmitted, isDirty },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            title: "", description: "", price: 0, stock: 0, category: "", image: "", images: "",
            isNew: false, freeDelivery: false, hasVideo: false, hasGift: false,
            showLowStock: false, allowInstallment: false,
            discountType: "no_discount", discountCategory: "SALE", status: "draft",
            fulfillmentType: "LOCAL",
        },
    });

    const watchTitle = watch("title");
    const watchImage = watch("image");
    const watchImages = watch("images");
    const watchCategory = watch("category");
    const watchOldPrice = watch("oldPrice");
    const watchPrice = watch("price");
    const watchDiscountValue = watch("discountValue");
    const watchDiscountType = watch("discountType");
    const watchFulfillmentType = watch("fulfillmentType");

    const gallery = useMemo(
        () => (watchImages || "").split("\n").map((s) => s.trim()).filter(Boolean),
        [watchImages]
    );
    const selectedCategories = useMemo(
        () => (watchCategory || "").split(",").filter(Boolean),
        [watchCategory]
    );
    const primaryCategoryId = useMemo(
        () => selectedCategories.length > 0 ? selectedCategories[0] : null,
        [selectedCategories]
    );

    /* ---------------------------------------------------------------- kategoriyalar */

    const loadCategories = useCallback(async () => {
        setCatState("loading");
        try {
            const res = await fetch("/api/admin/categories", { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            // Route xatoda `[]` qaytaradi, lekin sessiya tugab HTML kelsa
            // `categories.map` yiqilardi — shuning uchun tur tekshiriladi.
            if (!Array.isArray(data)) throw new Error("Noto'g'ri javob");
            setCategories(data);
            setCatState("ready");
        } catch (err) {
            console.error("Kategoriyalarni yuklash xatosi:", err);
            setCategories([]);
            setCatState("error");
        }
    }, []);

    useEffect(() => { void loadCategories(); }, [loadCategories]);

    // Brendlar — brandId select uchun (bitta yuklash, kategoriya emas)
    useEffect(() => {
        fetch("/api/admin/brands")
            .then(res => res.ok ? res.json() : [])
            .then((data) => setBrands(Array.isArray(data) ? data : []))
            .catch(() => setBrands([]));
    }, []);

    const visibleCategories = useMemo(() => {
        const q = catQuery.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c: any) => {
            const full = `${c.parent?.name || ""} ${c.name}`.toLowerCase();
            return full.includes(q);
        });
    }, [categories, catQuery]);

    const categoryLabel = useCallback(
        (id: string) => {
            const cat = categories.find((c: any) => c.id === id);
            if (!cat) return id;
            return cat.parent ? `${cat.parent.name} › ${cat.name}` : cat.name;
        },
        [categories]
    );

    const toggleCategory = (id: string, checked: boolean) => {
        const next = checked
            ? [...selectedCategories, id]
            : selectedCategories.filter((c) => c !== id);
        setValue("category", next.join(","), { shouldValidate: isSubmitted, shouldDirty: true });
    };

    const createCategory = async () => {
        const name = newCatName.trim();
        if (name.length < 2) {
            toast.error("Kategoriya nomi kamida 2 ta belgidan iborat bo'lishi kerak");
            return;
        }
        setCreatingCat(true);
        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, parentId: newCatParent || null, image: "", isActive: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(
                    res.status === 401
                        ? "Kategoriya yaratishga faqat ADMIN huquqi bor"
                        : data.error || "Kategoriya yaratilmadi"
                );
            }
            await loadCategories();
            if (data.id) {
                setValue("category", [...selectedCategories, data.id].join(","), {
                    shouldValidate: isSubmitted, shouldDirty: true,
                });
            }
            setNewCatName("");
            setNewCatParent("");
            setShowNewCategory(false);
            toast.success(`"${data.name || name}" qo'shildi va tanlandi`);
        } catch (err: any) {
            toast.error(err.message || "Kategoriya yaratilmadi");
        } finally {
            setCreatingCat(false);
        }
    };

    /* ------------------------------------------------------- takrorlanuvchi nom */

    useEffect(() => {
        const title = (watchTitle || "").trim();
        if (title.length < 3) {
            setDuplicate(null);
            return;
        }
        const handle = setTimeout(async () => {
            try {
                const res = await fetch(`/api/products?q=${encodeURIComponent(title)}`);
                if (!res.ok) return;
                const list = await res.json();
                if (!Array.isArray(list)) return;
                const exact = list.find(
                    (p: any) => String(p.title || "").trim().toLowerCase() === title.toLowerCase()
                );
                setDuplicate(exact ? { id: exact.id, title: exact.title } : null);
            } catch {
                /* tarmoq xatosi — ogohlantirish shunchaki chiqmaydi */
            }
        }, 600);
        return () => clearTimeout(handle);
    }, [watchTitle]);

    /* ------------------------------------------------------------ narx hisoblash */

    const oldPriceNum = Number(watchOldPrice || 0);
    const discountNum = Number(watchDiscountValue || 0);
    const discountActive = watchDiscountType !== "no_discount";
    // Narx faqat eski narx va chegirma birgalikda kiritilganda hisoblanadi.
    // Shu holatda maydon `readOnly` — ilgari effekt ikki tomonga ishlab,
    // foydalanuvchi kiritgan narxni darhol qaytarib tashlardi.
    const priceIsDerived = discountActive && oldPriceNum > 0 && discountNum > 0;

    const discountWarning = useMemo(() => {
        if (!discountActive || discountNum <= 0) return null;
        if (watchDiscountType === "percentage" && discountNum >= 100) {
            return "Foiz 100 dan kichik bo'lishi kerak, aks holda narx 0 bo'ladi.";
        }
        if (watchDiscountType === "fixed_price" && oldPriceNum > 0 && discountNum >= oldPriceNum) {
            return "Chegirma eski narxdan kichik bo'lishi kerak.";
        }
        if (!oldPriceNum) {
            return "Narx avtomatik hisoblanishi uchun \"Eski narx\"ni ham kiriting.";
        }
        return null;
    }, [discountActive, discountNum, watchDiscountType, oldPriceNum]);

    useEffect(() => {
        if (!priceIsDerived) return;
        const computed = watchDiscountType === "percentage"
            ? Math.round(oldPriceNum - oldPriceNum * (discountNum / 100))
            : Math.round(oldPriceNum - discountNum);
        const next = Math.max(0, computed);
        if (Number(watchPrice) !== next) {
            setValue("price", next, { shouldValidate: isSubmitted, shouldDirty: true });
        }
    }, [priceIsDerived, oldPriceNum, discountNum, watchDiscountType, watchPrice, setValue, isSubmitted]);

    /* ---------------------------------------------------------------- rasm yuklash */

    const appendGallery = useCallback((urls: string[]) => {
        if (!urls.length) return;
        const current = (watch("images") || "").split("\n").map((s) => s.trim()).filter(Boolean);
        const merged = [...current];
        urls.forEach((u) => { if (!merged.includes(u)) merged.push(u); });
        setValue("images", merged.join("\n"), { shouldDirty: true });
    }, [setValue, watch]);

    /** Asosiy rasm bo'sh bo'lsa birinchi rasmni unga qo'yadi, qolganini galereyaga. */
    const placeUrls = useCallback((urls: string[]) => {
        if (!urls.length) return;
        let rest = urls;
        if (!watch("image")) {
            setValue("image", urls[0], { shouldValidate: isSubmitted, shouldDirty: true });
            rest = urls.slice(1);
        }
        appendGallery(rest);
    }, [appendGallery, setValue, watch, isSubmitted]);

    const uploadOne = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(
                res.status === 401
                    ? "Sessiya tugagan — qaytadan kiring"
                    : data.error || `Yuklash muvaffaqiyatsiz (${res.status})`
            );
        }
        if (!data.url) throw new Error("Server rasm manzilini qaytarmadi");
        return data.url as string;
    };

    const handleFiles = useCallback(async (
        input: FileList | File[] | null,
        target: "main" | "gallery" | "auto"
    ) => {
        const files = Array.from(input || []);
        if (!files.length) return;

        const valid: File[] = [];
        files.forEach((file) => {
            if (!file.type.startsWith("image/")) {
                toast.error(`${file.name || "Fayl"}: faqat rasm fayllari qabul qilinadi`);
            } else if (file.size > MAX_IMAGE_BYTES) {
                toast.error(`${file.name}: ${(file.size / 1048576).toFixed(1)}MB — 10MB dan oshmasligi kerak`);
            } else {
                valid.push(file);
            }
        });
        if (!valid.length) return;

        setUploading((n) => n + valid.length);
        try {
            const results = await Promise.allSettled(valid.map(uploadOne));
            const urls: string[] = [];
            results.forEach((result, i) => {
                if (result.status === "fulfilled") urls.push(result.value);
                else toast.error(`${valid[i].name}: ${result.reason?.message || "yuklanmadi"}`);
            });
            if (!urls.length) return;

            if (target === "main") {
                setValue("image", urls[0], { shouldValidate: isSubmitted, shouldDirty: true });
                appendGallery(urls.slice(1));
                toast.success(urls.length > 1
                    ? `Asosiy rasm va ${urls.length - 1} ta galereya rasmi yuklandi`
                    : "Asosiy rasm yuklandi");
            } else if (target === "gallery") {
                appendGallery(urls);
                toast.success(`${urls.length} ta rasm galereyaga qo'shildi`);
            } else {
                placeUrls(urls);
                toast.success(`${urls.length} ta rasm yuklandi`);
            }
        } finally {
            setUploading((n) => Math.max(0, n - valid.length));
        }
    }, [appendGallery, placeUrls, setValue, isSubmitted]);

    /** Ctrl/Cmd+V — skrinshot yoki nusxalangan rasm, hamda rasm havolasi. */
    useEffect(() => {
        const onPaste = (event: ClipboardEvent) => {
            const clip = event.clipboardData;
            if (!clip) return;

            const imageFiles = Array.from(clip.files || []).filter((f) => f.type.startsWith("image/"));
            if (imageFiles.length) {
                event.preventDefault();
                void handleFiles(imageFiles, pasteZone || "auto");
                return;
            }

            // Rasm havolasi matn sifatida qo'yilgan bo'lsa. Matn maydonlariga
            // qo'yishga aralashilmaydi — aks holda oddiy nusxalash buzilardi.
            if (isTypingTarget(event.target)) return;
            const text = (clip.getData("text") || "").trim();
            if (!text || !isImageUrl(text)) return;
            event.preventDefault();
            if (pasteZone === "gallery") appendGallery([text]);
            else if (pasteZone === "main") setValue("image", text, { shouldValidate: isSubmitted, shouldDirty: true });
            else placeUrls([text]);
            toast.success("Rasm havolasi qo'shildi");
        };

        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, [handleFiles, pasteZone, appendGallery, placeUrls, setValue, isSubmitted]);

    const onDrop = (event: React.DragEvent, target: "main" | "gallery") => {
        event.preventDefault();
        setDragZone(null);
        const files = Array.from(event.dataTransfer?.files || []);
        if (files.length) {
            void handleFiles(files, target);
            return;
        }
        // Boshqa oynadan sudrab olib kelingan rasm — faqat havola keladi.
        const uri = (event.dataTransfer?.getData("text/uri-list")
            || event.dataTransfer?.getData("text") || "").trim();
        if (uri && isImageUrl(uri)) {
            if (target === "main") setValue("image", uri, { shouldValidate: isSubmitted, shouldDirty: true });
            else appendGallery([uri]);
            toast.success("Rasm havolasi qo'shildi");
        }
    };

    const removeGalleryImage = (url: string) => {
        setValue("images", gallery.filter((u) => u !== url).join("\n"), { shouldDirty: true });
    };

    const makeMainImage = (url: string) => {
        const previousMain = watch("image");
        setValue("image", url, { shouldValidate: isSubmitted, shouldDirty: true });
        const next = gallery.filter((u) => u !== url);
        if (previousMain && !next.includes(previousMain)) next.unshift(previousMain);
        setValue("images", next.join("\n"), { shouldDirty: true });
        toast.success("Asosiy rasm o'zgartirildi");
    };

    /* ------------------------------------------------------------- varyatsiyalar */

    const addAttribute = () => setAttributes((prev) => [...prev, { key: "", value: "" }]);
    const removeAttribute = (index: number) =>
        setAttributes((prev) => prev.filter((_, i) => i !== index));
    const updateAttribute = (index: number, field: "key" | "value", val: string) =>
        // Ilgari `[...attributes]` sayoz nusxa olib, `newAttrs[index][field] = val`
        // bilan mavjud obyektni o'zgartirardi — bu React holatini joyida buzish.
        setAttributes((prev) => prev.map((attr, i) => (i === index ? { ...attr, [field]: val } : attr)));

    const duplicateAttrKeys = useMemo(() => {
        const seen = new Set<string>();
        const dupes = new Set<string>();
        attributes.forEach((a) => {
            const key = a.key.trim().toLowerCase();
            if (!key) return;
            if (seen.has(key)) dupes.add(key);
            seen.add(key);
        });
        return dupes;
    }, [attributes]);

    const processBulkPaste = () => {
        if (!bulkText.trim()) {
            toast.error("Matn bo'sh");
            return;
        }
        const lines = bulkText.split("\n");
        const parsed: { key: string; value: string }[] = [];
        let skipped = 0;

        lines.forEach((line) => {
            if (!line.trim()) return;
            let key = "";
            let value = "";

            if (line.includes("\t")) {
                const parts = line.split("\t");
                key = parts[0];
                value = parts.slice(1).join(" ").trim();
            } else if (line.includes(":")) {
                const parts = line.split(":");
                key = parts[0];
                value = parts.slice(1).join(":").trim();
            } else if (line.includes(" - ")) {
                const parts = line.split(" - ");
                key = parts[0];
                value = parts.slice(1).join(" - ").trim();
            }

            if (key.trim() && value) parsed.push({ key: key.trim(), value: value.trim() });
            else skipped++;
        });

        if (!parsed.length) {
            toast.error("Format noto'g'ri. Har bir qatorda 'Nomi' va 'Qiymati' bo'lishi kerak");
            return;
        }

        setAttributes((prev) => [...prev.filter((a) => a.key || a.value), ...parsed]);
        setBulkText("");
        setShowBulkPaste(false);
        toast.success(
            skipped > 0
                ? `${parsed.length} ta xususiyat qo'shildi, ${skipped} ta qator o'tkazib yuborildi`
                : `${parsed.length} ta xususiyat qo'shildi`
        );
    };

    /* -------------------------------------------------- saqlanmagan o'zgarishlar */

    useEffect(() => {
        if (!isDirty || loading) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [isDirty, loading]);

    /* -------------------------------------------------------------------- saqlash */

    async function onSubmit(data: ProductFormValues) {
        setLoading(true);

        const imagesList = [...gallery];
        if (data.image && !imagesList.includes(data.image)) imagesList.unshift(data.image);

        const attrsObject: Record<string, string | string[]> = {};
        attributes.forEach((attr) => {
            if (attr.key && attr.value) {
                const values = attr.value.split(",").map((s) => s.trim()).filter(Boolean);
                if (values.length > 0) attrsObject[attr.key.trim()] = values;
            }
        });

        // Teglar ilgari serverga yetib bormasdi: API sxemasida `tags` kaliti yo'q,
        // zod esa notanish kalitlarni jimgina olib tashlaydi. Endi ular
        // `attributes._tags` ichida saqlanadi va mahsulot sahifasida SEO
        // kalit so'zlariga aylanadi.
        const tagList = (data.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (tagList.length) attrsObject._tags = tagList;

        // Dinamik xususiyatlar validatsiyasi — backend authoritative, lekin
        // frontendda ham tekshirib product yaratishga o'tmaymiz.
        const universalError = universalRef.current?.validate() ?? null;
        if (universalError) {
            toast.error(universalError);
            setLoading(false);
            return;
        }

        const categoryIds = selectedCategories;
        const noDiscount = data.discountType === "no_discount";

        // Tip: backend `attributes` har ikkala shaklni qabul qiladi — legacy
        // `Record<key, value[]>` va universal `[{attributeDefId, value}]`.
        const payload: Record<string, unknown> = {
            title: data.title.trim(),
            description: data.description.trim(),
            brand: data.brand?.trim() || undefined,
            brandId: brandId || null,
            price: data.price,
            stock: data.stock,
            oldPrice: data.oldPrice || null,
            // Chegirma yo'q bo'lganda ilgari ham `discountType: "SALE"` ketardi —
            // mahsulot bazada aksiyaday belgilanib qolardi.
            discount: noDiscount ? null : (data.discountValue ?? null),
            discountType: noDiscount ? null : data.discountCategory,
            // Hisoblash usuli alohida saqlanadi (spek: discountMethod ≠ discountCategory)
            discountMethod: noDiscount
                ? null
                : (data.discountType === "percentage" ? "PERCENTAGE" : data.discountType === "fixed_price" ? "FIXED" : "NONE"),
            vatPercent: data.vatAmount || 0,
            mxikCode: data.mxikCode?.trim() || undefined,
            packageCode: data.packageCode?.trim() || undefined,
            image: data.image,
            images: imagesList,
            attributes: attrsObject,
            status: data.status,
            isNew: data.isNew,
            freeDelivery: data.freeDelivery,
            hasVideo: data.hasVideo,
            hasGift: data.hasGift,
            showLowStock: data.showLowStock,
            allowInstallment: data.allowInstallment,
            fulfillmentType: data.fulfillmentType || "LOCAL",
            // Eski bitta-kategoriya ustuni uchun faqat birinchi ID yuboriladi.
            // Ilgari butun "id1,id2" qatori ketib, server hech qanday kategoriya
            // topmasdi: `categoryId` bo'sh qolib, `category` ustuniga ID'lar
            // qatori yozilardi — o'xshash mahsulotlar va breadcrumb ishlamasdi.
            category: categoryIds[0] || data.category,
            categoryIds,
        };

        try {
            // Qisman muvaffaqiyat bo'lsa (attrs/variants xato) qayta bosish
            // duplicate product yaratmasligi uchun PUT ga o'tiladi.
            let productId: string | null = createdId;
            if (createdId) {
                const res = await fetch(`/api/admin/products/${createdId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    const responseData = await res.json().catch(() => ({}));
                    let errorMessage = responseData.error || "Mahsulot yangilanmadi";
                    if (responseData.details) {
                        const details = responseData.details;
                        const errorFields = Object.keys(details).filter((k) => k !== "_errors");
                        if (errorFields.length > 0) {
                            const fieldErrors = errorFields
                                .map((field) => `${FIELD_LABELS[field] || field}: ${(details[field]._errors || []).join(", ")}`)
                                .join("; ");
                            errorMessage = `Ma'lumotlar xato: ${fieldErrors}`;
                        } else if (details._errors?.length > 0) {
                            errorMessage = details._errors.join(", ");
                        }
                    } else if (responseData.message) {
                        errorMessage = `${errorMessage}: ${responseData.message}`;
                    }
                    throw new Error(errorMessage);
                }
            } else {
                // Atomic save: attributes + variants bir xil POST'da transaction
                // ichida saqlanadi (backend prisma.$transaction). Qisman saqlash
                // bo'lmaydi — xato bo'lsa hammasi rollback qilinadi.
                const universalPayload = universalRef.current?.buildPayload() ?? null;
                if (universalPayload) {
                    payload.attributes = universalPayload.attributes;
                    payload.variants = universalPayload.variants;
                }

                const res = await fetch("/api/admin/products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const responseData = await res.json().catch(() => ({}));

                if (!res.ok) {
                    let errorMessage = responseData.error || "Mahsulot yaratilmadi";
                    if (responseData.details) {
                        const details = responseData.details;
                        const errorFields = Object.keys(details).filter((k) => k !== "_errors");
                        if (errorFields.length > 0) {
                            const fieldErrors = errorFields
                                .map((field) => `${FIELD_LABELS[field] || field}: ${(details[field]._errors || []).join(", ")}`)
                                .join("; ");
                            errorMessage = `Ma'lumotlar xato: ${fieldErrors}`;
                        } else if (details._errors?.length > 0) {
                            errorMessage = details._errors.join(", ");
                        }
                    } else if (responseData.message) {
                        errorMessage = `${errorMessage}: ${responseData.message}`;
                    }
                    throw new Error(errorMessage);
                }
                productId = responseData.id as string | null;
                if (!productId) throw new Error("Server mahsulot ID qaytarmadi");
            }

            // Edit (PUT) holatida structured attributes + variants alohida
            // saqlanadi (diff engine). Yangi yaratishda esa allaqachon
            // transaction ichida saqlandi — qayta chaqirilmaydi.
            if (createdId) {
                if (!productId) throw new Error("Mahsulot ID aniqlanmadi");
                const saved = await universalRef.current?.saveAttributesAndVariants(productId);
                if (!saved) {
                    setCreatedId(productId);
                    throw new Error("Mahsulot saqlandi, lekin xususiyatlar/variantlar saqlanmadi. Iltimos, qayta urinib ko'ring.");
                }
            }

            toast.success(createdId ? "Mahsulot muvaffaqiyatli yangilandi" : "Mahsulot muvaffaqiyatli yaratildi");
            router.push("/admin/products");
            router.refresh();
        } catch (error: any) {
            console.error("Submit error details:", error);
            toast.error(error.message || "Xatolik yuz berdi");
            setLoading(false);
        }
    }

    const errorList = Object.entries(errors)
        .map(([field, err]) => ({ field, message: (err as any)?.message as string }))
        .filter((e) => e.message);

    const busy = loading || uploading > 0;

    // Review panel uchun hisob-kitoblar
    const formData = watch();
    const noDiscount = watchDiscountType === "no_discount";
    const universalPayloadForReview = universalRef.current?.buildPayload() ?? null;
    const universalAttrCount = (universalPayloadForReview?.attributes || []).filter((a) => a.value !== null && a.value !== undefined && a.value !== "").length;
    const variantCount = (universalPayloadForReview?.variants || []).length;

    const reviewIssues: string[] = [];
    if (!formData.title?.trim()) reviewIssues.push("Mahsulot nomi kiritilmagan");
    if (selectedCategories.length === 0) reviewIssues.push("Kategoriya tanlanmagan");
    if (!(Number(formData.price) > 0)) reviewIssues.push("Narx kiritilmagan");
    if (!formData.image) reviewIssues.push("Asosiy rasm yuklanmagan");
    if (discountActive && !(Number(formData.discountValue) > 0)) reviewIssues.push("Chegirma miqdori kiritilmagan");

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="page">
            {/* Sarlavha */}
            <div className="page-head">
                <Link href="/admin/products" className="back-link" title="Mahsulotlar ro'yxatiga qaytish">
                    <ChevronLeft size={18} /> Mahsulotlar
                </Link>
                <div>
                    <h1 className="page-title">Yangi mahsulot</h1>
                    <p className="page-sub">
                        Majburiy maydonlar <span className="req">*</span> bilan belgilangan.
                        Rasmni sudrab tashlash yoki <b>Ctrl/⌘+V</b> bilan qo'yish mumkin.
                    </p>
                </div>
            </div>

            {isSubmitted && errorList.length > 0 && (
                <div className="banner-error" role="alert">
                    <AlertCircle size={20} className="banner-icon" />
                    <div>
                        <p className="banner-title">Saqlash uchun quyidagilarni to'g'rilang:</p>
                        <ul className="banner-list">
                            {errorList.map((e) => (
                                <li key={e.field}>
                                    <a href={`#field-${e.field}`}>{FIELD_LABELS[e.field] || e.field}</a> — {e.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Category-first step: birinchi navbatda kategoriya tanlanadi,
                so'ng shu kategoriya schema'si (xususiyatlar/variantlar) yuklanadi. */}
            <div className="cat-first-panel">
                <div className="cat-first-head">
                    <div>
                        <span className="cat-first-step">1-qadam</span>
                        <h2 className="cat-first-title">Kategoriya tanlang</h2>
                        <p className="cat-first-desc">
                            Kategoriya tanlangandan keyin shu kategoriyaning xususiyatlari va variantlari shakli
                            pastda avtomatik yuklanadi.
                        </p>
                    </div>
                    <div className="cat-first-selected">
                        {selectedCategories.length > 0 ? (
                            <span className="cat-first-chip">{selectedCategories.map(categoryLabel).join(", ")}</span>
                        ) : (
                            <span className="cat-first-hint">Tanlanmagan</span>
                        )}
                    </div>
                </div>
                {categories.length > 0 && (
                    <div className="cat-first-grid">
                        {categories
                            .filter((c: any) => !c.parentId)
                            .map((cat: any) => {
                                const active = selectedCategories.includes(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            // Faqat bitta asosiy kategoriya quick-select'da
                                            if (!active) {
                                                setValue("category", cat.id, { shouldValidate: isSubmitted, shouldDirty: true });
                                            }
                                        }}
                                        className={`cat-first-card ${active ? "active" : ""}`}
                                    >
                                        {cat.image && (
                                            <span className="cat-first-img">
                                                <img src={cat.image} alt="" />
                                            </span>
                                        )}
                                        <span className="cat-first-name">{cat.name}</span>
                                        {active && <span className="cat-first-check">✓</span>}
                                    </button>
                                );
                            })}
                    </div>
                )}
                <p className="cat-first-note">
                    <Link href="/admin/categories" className="warn-link">Kategoriya sxemasini boshqarish</Link> — xususiyatlar
                    va variantlar turlarini shu yerdan sozlashingiz mumkin.
                </p>
            </div>

            <div className="grid-main">
                {/* Chap ustun */}
                <div className="col">
                    <Card title="Umumiy" open={open.general} onToggle={() => toggle("general")}>
                        <div className="form-group" id="field-title">
                            <label className="label" htmlFor="p-title">
                                Mahsulot nomi <span className="req">*</span>
                            </label>
                            <input
                                id="p-title"
                                {...register("title")}
                                className={`input ${errors.title ? "invalid" : ""}`}
                                placeholder="Mahsulot nomi"
                            />
                            {errors.title && <span className="error">{errors.title.message}</span>}
                            {duplicate ? (
                                <p className="warn">
                                    Shu nomdagi mahsulot allaqachon bor:{" "}
                                    <Link href={`/admin/products/${duplicate.id}`} className="warn-link">
                                        {duplicate.title}
                                    </Link>
                                </p>
                            ) : (
                                <p className="helper-text">Mahsulot nomi majburiy va takrorlanmas bo'lishi tavsiya etiladi.</p>
                            )}
                        </div>
                        <div className="form-group" id="field-description">
                            <label className="label" htmlFor="p-desc">
                                Tavsif <span className="req">*</span>
                            </label>
                            <textarea
                                id="p-desc"
                                {...register("description")}
                                className={`input ${errors.description ? "invalid" : ""}`}
                                rows={6}
                                placeholder="Mahsulot tavsifi..."
                            />
                            {errors.description && <span className="error">{errors.description.message}</span>}
                            <p className="helper-text">
                                Mahsulot haqida batafsil ma'lumot bering — bu matn sayt SEO tavsifiga ham tushadi.
                            </p>
                        </div>
                    </Card>

                    <Card title="Media" open={open.media} onToggle={() => toggle("media")}>
                        <div className="form-group" id="field-image">
                            <label className="label">
                                Asosiy Rasm <span className="req">*</span>
                            </label>
                            <div
                                className={`upload-zone ${dragZone === "main" ? "dragging" : ""} ${errors.image ? "invalid" : ""}`}
                                onClick={() => document.getElementById("main-image-upload")?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragZone("main"); }}
                                onDragEnter={(e) => { e.preventDefault(); setDragZone("main"); }}
                                onDragLeave={() => setDragZone(null)}
                                onDrop={(e) => onDrop(e, "main")}
                                onMouseEnter={() => setPasteZone("main")}
                                onMouseLeave={() => setPasteZone((z) => (z === "main" ? null : z))}
                            >
                                {pasteZone === "main" && <span className="paste-badge">Ctrl/⌘+V</span>}
                                <UploadCloud size={40} color="#0085db" />
                                <p className="zone-title">Faylni tashlang, tanlang yoki qo'ying</p>
                                <p className="zone-sub">
                                    Rasmni shu yerga sudrab tashlang, <span className="zone-link">kompyuterdan tanlang</span>{" "}
                                    yoki <b>Ctrl/⌘+V</b> bilan qo'ying. PNG, JPG, WEBP — 10MB gacha.
                                </p>
                                <input
                                    id="main-image-upload"
                                    type="file"
                                    hidden
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => { void handleFiles(e.target.files, "main"); e.target.value = ""; }}
                                    title="Asosiy rasmni tanlang"
                                />
                            </div>
                            {errors.image && <span className="error">{errors.image.message}</span>}

                            {watchImage && (
                                <div className="main-preview">
                                    <img alt="Asosiy rasm" src={watchImage} className="image-full" />
                                    <button
                                        onClick={() => setValue("image", "", { shouldValidate: isSubmitted, shouldDirty: true })}
                                        type="button"
                                        className="thumb-btn danger"
                                        title="Asosiy rasmni o'chirish"
                                        aria-label="Asosiy rasmni o'chirish"
                                    >
                                        <X size={13} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <div className="label-row">
                                <label className="label">Galereya rasmlari</label>
                                <span className="count">{gallery.length} ta</span>
                            </div>
                            <div
                                className={`gallery-zone ${dragZone === "gallery" ? "dragging" : ""}`}
                                onDragOver={(e) => { e.preventDefault(); setDragZone("gallery"); }}
                                onDragEnter={(e) => { e.preventDefault(); setDragZone("gallery"); }}
                                onDragLeave={() => setDragZone(null)}
                                onDrop={(e) => onDrop(e, "gallery")}
                                onMouseEnter={() => setPasteZone("gallery")}
                                onMouseLeave={() => setPasteZone((z) => (z === "gallery" ? null : z))}
                            >
                                {pasteZone === "gallery" && <span className="paste-badge">Ctrl/⌘+V</span>}
                                {gallery.map((url) => (
                                    <div key={url} className="gallery-item">
                                        <img alt="Galereya rasmi" src={url} className="image-full" />
                                        <button
                                            type="button"
                                            onClick={() => makeMainImage(url)}
                                            className="thumb-btn star"
                                            title="Asosiy rasm qilish"
                                            aria-label="Asosiy rasm qilish"
                                        >
                                            <Star size={12} strokeWidth={3} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(url)}
                                            className="thumb-btn danger"
                                            title="Rasmni o'chirish"
                                            aria-label="Rasmni o'chirish"
                                        >
                                            <Trash2 size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => document.getElementById("gallery-upload")?.click()}
                                    className="gallery-add"
                                    title="Galereyaga rasm qo'shish"
                                    aria-label="Galereyaga rasm qo'shish"
                                >
                                    <Plus size={22} />
                                </button>
                                <input
                                    id="gallery-upload"
                                    type="file"
                                    hidden
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => { void handleFiles(e.target.files, "gallery"); e.target.value = ""; }}
                                    title="Galereya rasmlarini tanlang"
                                />
                            </div>
                            <p className="helper-text">
                                Bir vaqtda bir nechta rasm tanlash mumkin. <Link2 size={12} className="inline-icon" /> Rasm
                                havolasini ham qo'yish mumkin. Yulduzcha — rasmni asosiy qilish.
                            </p>
                            {uploading > 0 && (
                                <p className="uploading">
                                    <Loader2 size={14} className="animate-spin" /> {uploading} ta rasm yuklanmoqda...
                                </p>
                            )}
                        </div>
                    </Card>

                    <Card title="Varyatsiyalar va xususiyatlar" open={open.variations} onToggle={() => toggle("variations")}>
                        {attributes.length === 0 && (
                            <p className="helper-text no-margin">
                                Bitta qiymat texnik xususiyat sifatida, vergul bilan ajratilgan bir nechta qiymat esa
                                mahsulot sahifasida tanlov sifatida ko'rinadi.
                            </p>
                        )}

                        {attributes.map((attr, idx) => {
                            const isDupe = duplicateAttrKeys.has(attr.key.trim().toLowerCase());
                            return (
                                <div key={idx} className="attr-row">
                                    <div>
                                        {idx === 0 && <label className="label">Xususiyat nomi</label>}
                                        <input
                                            value={attr.key}
                                            onChange={(e) => updateAttribute(idx, "key", e.target.value)}
                                            className={`input ${isDupe ? "invalid" : ""}`}
                                            placeholder="Rang, O'lcham..."
                                        />
                                    </div>
                                    <div>
                                        {idx === 0 && <label className="label">Qiymati</label>}
                                        <input
                                            value={attr.value}
                                            onChange={(e) => updateAttribute(idx, "value", e.target.value)}
                                            className="input"
                                            placeholder="Qizil, Ko'k, Yashil"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeAttribute(idx)}
                                        className="btn-icon-danger"
                                        title="O'chirish"
                                        aria-label="Xususiyatni olib tashlash"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            );
                        })}

                        {duplicateAttrKeys.size > 0 && (
                            <p className="warn">
                                Bir xil nomdagi xususiyatlar bor — saqlashda faqat oxirgisi qoladi.
                            </p>
                        )}

                        <div className="row-gap">
                            <button type="button" onClick={addAttribute} className="btn-light-primary">
                                <Plus size={18} /> Xususiyat qo'shish
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBulkPaste(!showBulkPaste)}
                                className="btn-light-secondary"
                            >
                                <Copy size={18} /> Matndan nusxalash
                            </button>
                        </div>

                        {showBulkPaste && (
                            <div className="bulk-panel">
                                <h4 className="bulk-title">Xususiyatlarni matndan nusxalash</h4>
                                <p className="bulk-help">
                                    Excel yoki boshqa saytdan nusxalab tashlang. Har bir qator yangi xususiyat bo'ladi.
                                    <br />Format: <b>Nomi [Tab] Qiymati</b> yoki <b>Nomi: Qiymati</b>
                                </p>
                                <textarea
                                    className="input mono"
                                    rows={8}
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={"Masalan:\nRang\tQizil\nO'lcham\tXL\nMaterial: Paxta"}
                                />
                                <div className="row-gap top">
                                    <button type="button" onClick={processBulkPaste} className="btn-primary">
                                        Qo'shish
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowBulkPaste(false); setBulkText(""); }}
                                        className="btn-ghost-danger"
                                    >
                                        Yopish
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card title="Dinamik xususiyatlar va variantlar" right={<span className="count">kategoriya bo'yicha</span>}>
                        {categoryWarning && (
                            <p className="warn no-margin" style={{ marginBottom: "16px" }}>
                                Kategoriya o'zgartirilmoqda. Ba'zi xususiyatlar mos kelmasligi mumkin.
                            </p>
                        )}
                        <UniversalProductSections
                            ref={universalRef}
                            productId={null}
                            categoryId={primaryCategoryId}
                            onCategoryWarning={setCategoryWarning}
                            disabled={loading}
                        />
                    </Card>

                    <Card title="Narx" open={open.pricing} onToggle={() => toggle("pricing")}>
                        <div className="grid-2">
                            <div className="form-group" id="field-price">
                                <label className="label" htmlFor="p-price">
                                    Asosiy narx <span className="req">*</span>
                                </label>
                                <input
                                    id="p-price"
                                    {...register("price")}
                                    type="number"
                                    min={0}
                                    readOnly={priceIsDerived}
                                    className={`input ${errors.price ? "invalid" : ""} ${priceIsDerived ? "readonly" : ""}`}
                                    placeholder="Mahsulot narxi"
                                />
                                {errors.price && <span className="error">{errors.price.message}</span>}
                                <p className="helper-text">
                                    {priceIsDerived
                                        ? "Eski narx va chegirmadan avtomatik hisoblanadi."
                                        : "Mijoz to'laydigan narx."}
                                </p>
                            </div>
                            <div className="form-group" id="field-oldPrice">
                                <label className="label" htmlFor="p-oldprice">Eski narx (ixtiyoriy)</label>
                                <input
                                    id="p-oldprice"
                                    {...register("oldPrice")}
                                    type="number"
                                    min={0}
                                    className={`input ${errors.oldPrice ? "invalid" : ""}`}
                                    placeholder="0"
                                />
                                {errors.oldPrice && <span className="error">{errors.oldPrice.message}</span>}
                                <p className="helper-text">Chegirmadan oldingi narx — kartada chizilgan holda ko'rinadi.</p>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Chegirma turi</label>
                            <div className="radio-row">
                                <label className="radio-label">
                                    <input type="radio" value="no_discount" {...register("discountType")} /> Chegirma yo'q
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="percentage" {...register("discountType")} /> Foiz (%)
                                </label>
                                <label className="radio-label">
                                    <input type="radio" value="fixed_price" {...register("discountType")} /> Aniq summa
                                </label>
                            </div>
                        </div>

                        {discountActive && (
                            <>
                                <div className="grid-2">
                                    <div className="form-group" id="field-discountValue">
                                        <label className="label" htmlFor="p-disc">
                                            Chegirma miqdori {watchDiscountType === "percentage" ? "(%)" : "(so'm)"}
                                        </label>
                                        <input
                                            id="p-disc"
                                            {...register("discountValue")}
                                            type="number"
                                            min={0}
                                            className={`input ${errors.discountValue ? "invalid" : ""}`}
                                            placeholder="0"
                                        />
                                        {errors.discountValue && <span className="error">{errors.discountValue.message}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="label" htmlFor="p-disc-cat">Chegirma kategoriyasi</label>
                                        <select id="p-disc-cat" {...register("discountCategory")} className="input">
                                            <option value="SALE">Aksiya (SALE)</option>
                                            <option value="PROMO">Promo (PROMO)</option>
                                            <option value="HOT">Qaynoq (HOT)</option>
                                        </select>
                                        <p className="helper-text">
                                            PROMO va HOT kartada "AKSIYA" stikerini chiqaradi; yetkazib berish
                                            shartlarida ham shu tur ishlatiladi.
                                        </p>
                                    </div>
                                </div>
                                {discountWarning && <p className="warn no-margin">{discountWarning}</p>}
                            </>
                        )}

                        <div className="form-group" id="field-vatAmount">
                            <label className="label" htmlFor="p-vat">QQS (%)</label>
                            <input
                                id="p-vat"
                                {...register("vatAmount")}
                                type="number"
                                min={0}
                                max={100}
                                className={`input ${errors.vatAmount ? "invalid" : ""}`}
                                placeholder="0"
                            />
                            {errors.vatAmount && <span className="error">{errors.vatAmount.message}</span>}
                            <p className="helper-text">0 dan 100 gacha. Hisob-fakturada shu foiz ishlatiladi.</p>
                        </div>
                    </Card>
                </div>

                {/* O'ng ustun */}
                <div className="col">
                    <Card title="Holat" right={<span className={`status-dot ${watch("status")}`} />}>
                        <div className="form-group no-margin">
                            <label className="label" htmlFor="p-status">Mahsulot holati</label>
                            <select id="p-status" {...register("status")} className="input">
                                <option value="published">Nashr qilingan</option>
                                <option value="draft">Qoralama</option>
                                <option value="inactive">Faol emas</option>
                            </select>
                            <p className="helper-text">
                                Saytda faqat <b>Nashr qilingan</b> mahsulotlar ko'rinadi.
                            </p>
                        </div>
                    </Card>

                    <Card title="Mahsulot ma'lumotlari" open={open.details} onToggle={() => toggle("details")}>
                        <div className="form-group" id="field-category">
                            <div className="label-row">
                                <label className="label">
                                    Kategoriyalar <span className="req">*</span>
                                </label>
                                <span className="count">{selectedCategories.length} tanlangan</span>
                            </div>

                            {selectedCategories.length > 0 && (
                                <div className="chips">
                                    {selectedCategories.map((id) => (
                                        <span key={id} className="chip">
                                            {categoryLabel(id)}
                                            <button
                                                type="button"
                                                onClick={() => toggleCategory(id, false)}
                                                title="Olib tashlash"
                                                aria-label={`${categoryLabel(id)} kategoriyasini olib tashlash`}
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="cat-search">
                                <Search size={15} />
                                <input
                                    value={catQuery}
                                    onChange={(e) => setCatQuery(e.target.value)}
                                    placeholder="Kategoriya qidirish..."
                                    className="cat-search-input"
                                />
                                {catQuery && (
                                    <button type="button" onClick={() => setCatQuery("")} title="Tozalash" aria-label="Qidiruvni tozalash">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="cat-box">
                                <div className="cat-scroll">
                                    {catState === "loading" && (
                                        <p className="cat-empty"><Loader2 size={14} className="animate-spin" /> Yuklanmoqda...</p>
                                    )}
                                    {catState === "error" && (
                                        <p className="cat-empty">
                                            Kategoriyalar yuklanmadi.{" "}
                                            <button type="button" className="link-btn" onClick={() => void loadCategories()}>
                                                Qayta urinish
                                            </button>
                                        </p>
                                    )}
                                    {catState === "ready" && visibleCategories.length === 0 && (
                                        <p className="cat-empty">
                                            {catQuery ? `"${catQuery}" bo'yicha topilmadi` : "Hali kategoriya yo'q"}
                                        </p>
                                    )}
                                    {visibleCategories.map((cat: any) => {
                                        const isSelected = selectedCategories.includes(cat.id);
                                        return (
                                            <label key={cat.id} className={`cat-item ${isSelected ? "selected" : ""}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => toggleCategory(cat.id, e.target.checked)}
                                                />
                                                <span className="cat-name">
                                                    {cat.parent && <span className="cat-parent">{cat.parent.name} › </span>}
                                                    {cat.name}
                                                </span>
                                                {typeof cat._count?.products === "number" && (
                                                    <span className="cat-count">{cat._count.products}</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                                <span className="cat-fade" aria-hidden="true" />
                            </div>

                            {errors.category && <span className="error">{errors.category.message}</span>}
                            <p className="helper-text">
                                Mahsulotni bir yoki bir nechta kategoriyaga biriktiring. Birinchi tanlangan kategoriya
                                asosiy hisoblanadi (breadcrumb va o'xshash mahsulotlar uchun).
                            </p>

                            {!showNewCategory ? (
                                <button
                                    type="button"
                                    className="btn-light-primary full"
                                    onClick={() => setShowNewCategory(true)}
                                >
                                    <FolderPlus size={16} /> Yangi kategoriya yaratish
                                </button>
                            ) : (
                                <div className="new-cat-panel">
                                    <label className="label" htmlFor="new-cat-name">Yangi kategoriya nomi</label>
                                    <input
                                        id="new-cat-name"
                                        value={newCatName}
                                        onChange={(e) => setNewCatName(e.target.value)}
                                        onKeyDown={(e) => {
                                            // Enter bu yerda mahsulot formasini yubormasligi kerak.
                                            if (e.key === "Enter") { e.preventDefault(); void createCategory(); }
                                        }}
                                        className="input"
                                        placeholder="Masalan: Maktab kitoblari"
                                    />
                                    <label className="label top" htmlFor="new-cat-parent">Ota kategoriya (ixtiyoriy)</label>
                                    <select
                                        id="new-cat-parent"
                                        value={newCatParent}
                                        onChange={(e) => setNewCatParent(e.target.value)}
                                        className="input"
                                    >
                                        <option value="">— Yo'q (yuqori daraja) —</option>
                                        {categories.map((c: any) => (
                                            <option key={c.id} value={c.id}>
                                                {c.parent ? `${c.parent.name} › ${c.name}` : c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="row-gap top">
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            onClick={() => void createCategory()}
                                            disabled={creatingCat}
                                        >
                                            {creatingCat && <Loader2 size={16} className="animate-spin" />}
                                            {creatingCat ? "Yaratilmoqda..." : "Yaratish"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-ghost-danger"
                                            onClick={() => { setShowNewCategory(false); setNewCatName(""); setNewCatParent(""); }}
                                        >
                                            Bekor qilish
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="label" htmlFor="p-brand">Brend</label>
                            <div className="flex gap-2">
                                <select
                                    id="p-brand"
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
                            <p className="helper-text">Mavjud brenddan tanlang yoki yangi nom yozing.</p>
                        </div>
                        <div className="form-group no-margin">
                            <label className="label" htmlFor="p-tags">Teglar</label>
                            <input
                                id="p-tags"
                                {...register("tags")}
                                className="input"
                                placeholder="kitob, tarix, sovg'a"
                            />
                            <p className="helper-text">
                                Vergul bilan ajrating. Teglar mahsulot sahifasining SEO kalit so'zlariga aylanadi.
                            </p>
                        </div>
                    </Card>

                    <Card title="Sotuv turi" open={open.fulfillment} onToggle={() => toggle("fulfillment")}>
                        <div className="form-group no-margin">
                            <fieldset>
                                <legend className="label">Sotuv turi</legend>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50">
                                        <input type="radio" value="LOCAL" {...register("fulfillmentType")} className="accent-blue-600" />
                                        <span className="text-sm font-bold text-slate-700">Oddiy mahsulot</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-red-50 border-red-100">
                                        <input type="radio" value="CHINA_ORDER" {...register("fulfillmentType")} className="accent-red-600" />
                                        <span className="text-sm font-bold text-red-700">🇨🇳 Xitoydan buyurtma</span>
                                    </label>
                                </div>
                            </fieldset>
                            {watchFulfillmentType === "CHINA_ORDER" && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 space-y-1">
                                    <div className="font-black">🇨🇳 Xitoydan buyurtma</div>
                                    <div>Mahsulot narxi 100% oldindan to'lanadi.</div>
                                    <div>Kargo xarajati mahsulot kelgandan keyin alohida hisoblanadi.</div>
                                    <div>Kargo summasi mahsulot narxiga kiritilmaydi.</div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Ombor" open={open.inventory} onToggle={() => toggle("inventory")}>
                        <div className="form-group no-margin" id="field-stock">
                            <label className="label" htmlFor="p-stock">Ombordagi soni</label>
                            <input
                                id="p-stock"
                                {...register("stock")}
                                type="number"
                                min={0}
                                className={`input ${errors.stock ? "invalid" : ""}`}
                                placeholder="0"
                            />
                            {errors.stock && <span className="error">{errors.stock.message}</span>}
                            <p className="helper-text">0 bo'lsa kartada "Tugagan" belgisi chiqadi.</p>
                        </div>
                    </Card>

                    <Card title="Fiskal ma'lumotlar" open={open.fiscal} onToggle={() => toggle("fiscal")}>
                        <div className="form-group">
                            <label className="label" htmlFor="p-mxik">IKPU / MXIK kodi</label>
                            <input
                                id="p-mxik"
                                {...register("mxikCode")}
                                className="input"
                                inputMode="numeric"
                                maxLength={17}
                                placeholder="00000000000000000"
                            />
                            <p className="helper-text">Soliq cheki va hisob-faktura uchun kerak (17 xonali).</p>
                        </div>
                        <div className="form-group no-margin">
                            <label className="label" htmlFor="p-package">Qadoq kodi</label>
                            <input
                                id="p-package"
                                {...register("packageCode")}
                                className="input"
                                inputMode="numeric"
                                placeholder="1512416"
                            />
                        </div>
                    </Card>

                    <Card title="Marketing" open={open.marketing} onToggle={() => toggle("marketing")}>
                        <div className="grid-1">
                            <label className="checkbox-label">
                                <input type="checkbox" {...register("isNew")} className="checkbox-input" />
                                <span>✨ "YANGI" belgisi</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" {...register("freeDelivery")} className="checkbox-input" />
                                <span>🚚 Bepul yetkazib berish</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" {...register("hasVideo")} className="checkbox-input" />
                                <span>🎬 Video-sharh mavjud</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" {...register("hasGift")} className="checkbox-input" />
                                <span>🎁 Sovg'asi bor</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" {...register("showLowStock")} className="checkbox-input" />
                                <span>⚠️ "Kam qoldi" ogohlantirishi</span>
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" {...register("allowInstallment")} className="checkbox-input" />
                                <span>💰 Bo'lib to'lash</span>
                            </label>
                        </div>
                        <p className="helper-text">
                            "Kam qoldi" faqat ombordagi soni 1–9 bo'lganda ko'rinadi.
                        </p>
                    </Card>
                </div>
            </div>

            {/* Review panel — saqlashdan oldin barcha ma'lumotlarni ko'rib chiqish */}
            <div className="review-panel">
                <div className="review-head">
                    <div>
                        <h3 className="review-title">Ko'rib chiqish</h3>
                        <p className="review-sub">Saqlashdan oldin ma'lumotlarni tekshiring. Yashil — to'ldirilgan, qizil — yetishmayapti.</p>
                    </div>
                    <span className="review-badge">{reviewIssues.length === 0 ? "✓ Tayyor" : `${reviewIssues.length} ta muammo`}</span>
                </div>
                <div className="review-grid">
                    <div className={`review-item ${formData.title?.trim() ? 'ok' : 'bad'}`}>
                        <span className="review-k">Nomi</span>
                        <span className="review-v">{formData.title?.trim() || "— kiritilmagan"}</span>
                    </div>
                    <div className={`review-item ${selectedCategories.length > 0 ? 'ok' : 'bad'}`}>
                        <span className="review-k">Kategoriya</span>
                        <span className="review-v">{selectedCategories.length > 0 ? selectedCategories.map(categoryLabel).join(", ") : "— tanlanmagan"}</span>
                    </div>
                    <div className={`review-item ${formData.price > 0 ? 'ok' : 'bad'}`}>
                        <span className="review-k">Narx</span>
                        <span className="review-v">{formData.price > 0 ? `${formData.price.toLocaleString()} so'm` : "— kiritilmagan"}</span>
                    </div>
                    <div className={`review-item ${formData.oldPrice && formData.oldPrice > formData.price ? 'ok' : 'info'}`}>
                        <span className="review-k">Eski narx</span>
                        <span className="review-v">{formData.oldPrice ? `${formData.oldPrice.toLocaleString()} so'm` : "yo'q"}</span>
                    </div>
                    <div className={`review-item ${formData.image ? 'ok' : 'bad'}`}>
                        <span className="review-k">Asosiy rasm</span>
                        <span className="review-v">{formData.image ? `✓ (${gallery.length + 1} ta rasm)` : "— yuklanmagan"}</span>
                    </div>
                    <div className={`review-item ${Number(formData.stock) >= 0 ? 'ok' : 'info'}`}>
                        <span className="review-k">Ombor</span>
                        <span className="review-v">{Number(formData.stock)} dona</span>
                    </div>
                    <div className={`review-item ${formData.status ? 'ok' : 'info'}`}>
                        <span className="review-k">Holat</span>
                        <span className="review-v">{formData.status === "published" ? "Nashr" : formData.status === "draft" ? "Qoralama" : "Faol emas"}</span>
                    </div>
                    <div className={`review-item ${brandId || formData.brand?.trim() ? 'ok' : 'info'}`}>
                        <span className="review-k">Brend</span>
                        <span className="review-v">{brandId ? (brands.find(b => b.id === brandId)?.name || brandId) : (formData.brand?.trim() || "yo'q")}</span>
                    </div>
                    <div className={`review-item ${!noDiscount ? 'ok' : 'info'}`}>
                        <span className="review-k">Chegirma</span>
                        <span className="review-v">{noDiscount ? "yo'q" : `${formData.discountValue}${formData.discountType === "percentage" ? "%" : " so'm"} (${formData.discountCategory})`}</span>
                    </div>
                    <div className={`review-item ${(brands.length && (universalAttrCount > 0 || variantCount > 0)) ? 'ok' : 'info'}`}>
                        <span className="review-k">Xususiyatlar</span>
                        <span className="review-v">{universalAttrCount > 0 ? `${universalAttrCount} ta` : "yo'q"}</span>
                    </div>
                    <div className={`review-item ${variantCount > 0 ? 'ok' : 'info'}`}>
                        <span className="review-k">Variantlar</span>
                        <span className="review-v">{variantCount > 0 ? `${variantCount} ta` : "yo'q"}</span>
                    </div>
                </div>
                {reviewIssues.length > 0 && (
                    <ul className="review-issues">
                        {reviewIssues.map((issue, i) => (
                            <li key={i}>❌ {issue}</li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Pastki panel */}
            <div className="footer-actions">
                <span className="footer-hint">
                    {uploading > 0
                        ? `${uploading} ta rasm yuklanmoqda...`
                        : isDirty ? "Saqlanmagan o'zgarishlar bor" : ""}
                </span>
                <button type="button" onClick={() => router.push("/admin/products")} className="btn-ghost-danger">
                    Bekor qilish
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                    {loading && <Loader2 className="animate-spin" size={18} />}
                    {loading ? "Saqlanmoqda..." : uploading > 0 ? "Rasm yuklanmoqda..." : "Mahsulot qo'shish"}
                </button>
            </div>

            <style jsx>{`
                .page { padding: 0 0 96px; }

                .page-head { margin-bottom: 24px; }
                /* Link va lucide ikonkalari — styled-jsx o'z sinf nomini faqat
                   oddiy DOM elementlariga qo'shadi, komponentlarga emas. Shuning
                   uchun :global kerak, lekin u har doim scope'langan ajdod
                   ostida yoziladi — aks holda qoida butun sayt bo'ylab tarqaydi. */
                .page-head :global(.back-link) {
                    display: inline-flex; align-items: center; gap: 4px; margin-bottom: 12px;
                    font-size: 13px; font-weight: 600; color: #5A6A85; text-decoration: none;
                }
                .page-head :global(.back-link):hover { color: #0085db; }
                .page-title { font-size: 24px; font-weight: 800; color: #2A3547; margin: 0; }
                .page-sub { font-size: 13px; color: #7c8fac; margin: 4px 0 0; }
                .req { color: #fa896b; }

                .banner-error {
                    display: flex; gap: 12px; align-items: flex-start; margin-bottom: 24px;
                    background: #fdede8; border: 1px solid #f7c8bb; color: #a33a20;
                    padding: 16px 18px; border-radius: 12px;
                }
                .banner-error :global(.banner-icon) { flex-shrink: 0; margin-top: 2px; }
                .banner-title { margin: 0 0 6px; font-weight: 700; font-size: 14px; }
                .banner-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.7; }
                .banner-list a { color: #a33a20; font-weight: 600; }

                .grid-main {
                    display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
                    gap: 24px; align-items: start;
                }
                .col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }

                .form-group { margin-bottom: 20px; }
                .form-group.no-margin { margin-bottom: 0; }
                .label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px; color: #2A3547; }
                .label.top { margin-top: 12px; }
                .label-row { display: flex; justify-content: space-between; align-items: center; }
                .count { font-size: 12px; font-weight: 600; color: #7c8fac; }

                .input {
                    width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid #e5eaef;
                    outline: none; font-size: 14px; transition: border-color 0.2s, box-shadow 0.2s;
                    color: #2A3547; background: #fff; font-family: inherit;
                }
                .input:focus { border-color: #0085db; box-shadow: 0 0 0 3px rgba(0,133,219,0.12); }
                .input.invalid { border-color: #fa896b; }
                .input.readonly { background: #f4f7fb; color: #5A6A85; cursor: not-allowed; }
                .input.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.5; }

                .helper-text { font-size: 12px; color: #7c8fac; margin: 6px 0 0; line-height: 1.5; }
                .helper-text.no-margin { margin-bottom: 16px; }
                .error { font-size: 12px; color: #fa896b; margin-top: 4px; display: block; font-weight: 500; }
                .warn { font-size: 12px; color: #b26a00; background: #fff6e6; border: 1px solid #ffe0a6;
                        padding: 8px 10px; border-radius: 8px; margin: 6px 0 0; line-height: 1.5; }
                .warn.no-margin { margin-top: 0; }
                .warn :global(.warn-link) { color: #8a5200; font-weight: 700; text-decoration: underline; }

                .upload-zone {
                    position: relative; border: 2px dashed #e5eaef; border-radius: 12px; padding: 32px 20px;
                    text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    background: #fcfdfe;
                }
                .upload-zone:hover { border-color: #0085db; background: #f7fbff; }
                .upload-zone.dragging { border-color: #0085db; background: #ecf5ff; }
                .upload-zone.invalid { border-color: #fa896b; }
                .zone-title { margin: 12px 0 4px; font-size: 15px; font-weight: 600; color: #2A3547; }
                .zone-sub { margin: 0; font-size: 12px; color: #7c8fac; max-width: 380px; line-height: 1.6; }
                .zone-link { color: #0085db; font-weight: 600; }
                .paste-badge {
                    position: absolute; top: 8px; right: 10px; font-size: 10px; font-weight: 700;
                    letter-spacing: 0.04em; color: #0085db; background: #ecf5ff;
                    border: 1px solid #cfe6fb; padding: 3px 7px; border-radius: 6px;
                }

                .main-preview {
                    position: relative; width: 112px; height: 112px; border-radius: 10px;
                    overflow: hidden; border: 1px solid #e5eaef; margin-top: 14px; background: #f8f9fa;
                }
                .gallery-zone {
                    position: relative; display: flex; gap: 10px; flex-wrap: wrap; padding: 12px;
                    border: 2px dashed transparent; border-radius: 12px; transition: border-color 0.2s, background 0.2s;
                    background: #fafbfc; min-height: 96px; align-items: center;
                }
                .gallery-zone.dragging { border-color: #0085db; background: #ecf5ff; }
                .gallery-item {
                    position: relative; width: 78px; height: 78px; border-radius: 8px;
                    overflow: hidden; border: 1px solid #e5eaef; background: #fff;
                }
                .image-full { width: 100%; height: 100%; object-fit: cover; display: block; }
                .thumb-btn {
                    position: absolute; top: 3px; width: 20px; height: 20px; border-radius: 50%;
                    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    color: #fff; opacity: 0; transition: opacity 0.15s;
                }
                .gallery-item:hover .thumb-btn, .main-preview:hover .thumb-btn { opacity: 1; }
                .thumb-btn.danger { right: 3px; background: rgba(220,38,38,0.9); }
                .thumb-btn.star { left: 3px; background: rgba(245,158,11,0.95); }
                .gallery-add {
                    width: 78px; height: 78px; border-radius: 8px; border: 2px dashed #d7dfe8;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    color: #9aa8bb; background: #fff; transition: all 0.2s;
                }
                .gallery-add:hover { border-color: #0085db; color: #0085db; background: #f7fbff; }
                .uploading {
                    display: flex; align-items: center; gap: 6px; margin: 8px 0 0;
                    font-size: 12px; font-weight: 600; color: #0085db;
                }
                .helper-text :global(.inline-icon) { vertical-align: -2px; }

                .attr-row {
                    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 40px;
                    gap: 12px; align-items: end; margin-bottom: 12px;
                }
                .btn-icon-danger {
                    width: 40px; height: 40px; background: #fdede8; color: #fa896b; border: none;
                    border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer;
                }
                .btn-icon-danger:hover { background: #fbdcd3; }

                .row-gap { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
                .row-gap.top { margin-top: 14px; }

                .bulk-panel {
                    margin-top: 16px; background: #f8f9fa; padding: 20px;
                    border-radius: 12px; border: 1px solid #e5eaef;
                }
                .bulk-title { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #2A3547; }
                .bulk-help { font-size: 13px; color: #5A6A85; margin-bottom: 14px; line-height: 1.6; }

                .radio-row { display: flex; gap: 20px; margin: 10px 0 0; flex-wrap: wrap; }
                .radio-label {
                    display: flex; align-items: center; gap: 8px; font-size: 14px;
                    color: #5A6A85; cursor: pointer;
                }

                .grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
                .grid-1 { display: grid; grid-template-columns: 1fr; gap: 12px; }

                .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #00ceb6; }
                .status-dot.draft { background: #ffae1f; }
                .status-dot.inactive { background: #fa896b; }

                .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
                .chip {
                    display: inline-flex; align-items: center; gap: 6px; background: #ecf2ff;
                    color: #0068ad; border: 1px solid #cfe0f7; border-radius: 999px;
                    padding: 4px 6px 4px 10px; font-size: 12px; font-weight: 600; max-width: 100%;
                }
                .chip button {
                    display: flex; align-items: center; justify-content: center; width: 16px; height: 16px;
                    border: none; border-radius: 50%; background: #cfe0f7; color: #0068ad; cursor: pointer;
                    flex-shrink: 0;
                }
                .chip button:hover { background: #0085db; color: #fff; }

                .cat-search {
                    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
                    border: 1px solid #e5eaef; border-radius: 8px; margin-bottom: 8px; color: #9aa8bb;
                    background: #fff;
                }
                .cat-search:focus-within { border-color: #0085db; }
                .cat-search-input {
                    flex: 1; border: none; outline: none; font-size: 13px; color: #2A3547;
                    background: transparent; min-width: 0; font-family: inherit;
                }
                .cat-search button {
                    border: none; background: transparent; color: #9aa8bb; cursor: pointer;
                    display: flex; align-items: center; padding: 0;
                }

                .cat-box {
                    position: relative; background: #f8f9fa; border-radius: 12px; border: 1px solid #e5eaef;
                }
                .cat-scroll {
                    display: flex; flex-direction: column; gap: 6px; max-height: 260px;
                    overflow-y: auto; padding: 12px 12px 20px;
                    overscroll-behavior: contain; scrollbar-width: thin;
                }
                /* Ilgari ro'yxat matn o'rtasidan qirqilib, siljitish mumkinligi
                   ko'rinmasdi — pastdagi oq gradient shuni bildiradi. */
                .cat-fade {
                    position: absolute; left: 1px; right: 1px; bottom: 1px; height: 24px;
                    border-radius: 0 0 12px 12px; pointer-events: none;
                    background: linear-gradient(to top, #f8f9fa 20%, rgba(248,249,250,0));
                }
                .cat-item {
                    display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 8px;
                    cursor: pointer; background: #fff; border: 1px solid #e5eaef;
                    font-size: 13px; font-weight: 500; color: #5A6A85; transition: all 0.15s;
                }
                .cat-item:hover { border-color: #b9d8f2; }
                .cat-item.selected { background: #ecf2ff; border-color: #0085db; color: #0068ad; font-weight: 600; }
                .cat-item input { width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
                .cat-name { flex: 1; min-width: 0; line-height: 1.4; }
                .cat-parent { color: #9aa8bb; font-weight: 500; }
                .cat-item.selected .cat-parent { color: #5b9bd0; }
                .cat-count {
                    flex-shrink: 0; font-size: 11px; font-weight: 700; color: #7c8fac;
                    background: #f0f3f7; border-radius: 999px; padding: 1px 7px;
                }
                .cat-empty {
                    display: flex; align-items: center; gap: 6px; justify-content: center;
                    font-size: 13px; color: #7c8fac; padding: 20px 0; margin: 0; text-align: center;
                }
                .link-btn {
                    border: none; background: transparent; color: #0085db; font-weight: 600;
                    cursor: pointer; text-decoration: underline; font-size: 13px; padding: 0;
                    font-family: inherit;
                }

                .new-cat-panel {
                    margin-top: 10px; padding: 16px; background: #f8f9fa;
                    border: 1px solid #e5eaef; border-radius: 12px;
                }

                .btn-light-primary {
                    background: #ecf2ff; color: #0085db; border: none; padding: 10px 18px;
                    border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex;
                    align-items: center; justify-content: center; gap: 8px; font-size: 14px;
                    transition: background 0.2s; font-family: inherit;
                }
                .btn-light-primary:hover { background: #dfe9ff; }
                .btn-light-primary.full { width: 100%; margin-top: 12px; }

                .btn-light-secondary {
                    background: #f0f2f5; color: #5A6A85; border: none; padding: 10px 18px;
                    border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex;
                    align-items: center; gap: 8px; font-size: 14px; transition: background 0.2s;
                    font-family: inherit;
                }
                .btn-light-secondary:hover { background: #e5e8ed; }

                .btn-primary {
                    background: #0085db; color: #fff; padding: 11px 24px; border-radius: 8px; border: none;
                    font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex;
                    align-items: center; justify-content: center; gap: 8px;
                    box-shadow: 0 4px 12px rgba(0,133,219,0.2); transition: background 0.2s;
                    font-family: inherit;
                }
                .btn-primary:hover:not(:disabled) { background: #0072bd; }
                .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

                .btn-ghost-danger {
                    background: transparent; color: #fa896b; border: 1px solid #f7c8bb;
                    padding: 11px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;
                    cursor: pointer; transition: background 0.2s; font-family: inherit;
                }
                .btn-ghost-danger:hover { background: #fdede8; }

                .checkbox-label {
                    display: flex; align-items: center; gap: 10px; cursor: pointer;
                    font-size: 14px; color: #5A6A85; font-weight: 500;
                }
                .checkbox-input { width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; }

                /* Review panel — saqlashdan oldin ko'rib chiqish */
                .review-panel {
                    background: #f8fafc; border: 1px solid #e5eaef; border-radius: 12px;
                    padding: 20px; margin-bottom: 20px;
                }
                .review-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
                .review-title { font-size: 16px; font-weight: 700; color: #2A3547; margin: 0; }
                .review-sub { font-size: 12px; color: #7c8fac; margin: 4px 0 0; }
                .review-badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; }
                .review-badge:has(:only-child) { display: none; }
                .review-badge:contains("✓") { background: #e6f7e6; color: #0d7c0d; }
                .review-badge:contains("muammo") { background: #fdede8; color: #a33a20; }
                .review-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
                .review-item {
                    display: flex; flex-direction: column; gap: 2px; padding: 10px 12px;
                    border-radius: 8px; border: 1px solid #e5eaef; background: #fff;
                }
                .review-item.ok { border-color: #b7e4b7; background: #f2faf2; }
                .review-item.bad { border-color: #f7c8bb; background: #fef7f5; }
                .review-item.info { border-color: #d3e6f7; background: #f4f9ff; }
                .review-k { font-size: 10px; font-weight: 600; color: #7c8fac; text-transform: uppercase; letter-spacing: .03em; }
                .review-v { font-size: 13px; font-weight: 600; color: #2A3547; word-break: break-word; }
                .review-issues { margin: 12px 0 0; padding: 0; list-style: none; font-size: 12px; color: #a33a20; }
                .review-issues li { padding: 4px 0; }

                /* Uzun formada saqlash tugmasi doim ko'rinib turadi. */
                .footer-actions {
                    position: sticky; bottom: 0; z-index: 5; margin-top: 24px;
                    display: flex; justify-content: flex-end; align-items: center; gap: 14px;
                    padding: 16px 20px; background: rgba(255,255,255,0.92);
                    /* Faqat standart xossa: qo'lda -webkit- prefiksi yozilsa,
                       lightningcss standart xossani tashlab yuboradi va blur
                       Chrome'da umuman ishlamaydi. Prefiksni kompilyator qo'shadi. */
                    backdrop-filter: blur(8px);
                    border-top: 1px solid #e5eaef; border-radius: 12px 12px 0 0;
                }
                .footer-hint { flex: 1; font-size: 12px; color: #7c8fac; font-weight: 500; }

                /* Category-first panel — form tepasida */
                .cat-first-panel {
                    background: #f4f9ff; border: 1px solid #d3e6f7; border-radius: 12px;
                    padding: 20px 24px; margin-bottom: 24px;
                }
                .cat-first-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
                .cat-first-step { font-size: 11px; font-weight: 800; color: #0085db; text-transform: uppercase; letter-spacing: .05em; }
                .cat-first-title { font-size: 16px; font-weight: 700; color: #2A3547; margin: 4px 0 0; }
                .cat-first-desc { font-size: 12px; color: #7c8fac; margin: 4px 0 0; line-height: 1.5; max-width: 500px; }
                .cat-first-selected { flex-shrink: 0; margin-top: 4px; }
                .cat-first-chip { font-size: 12px; font-weight: 700; color: #0085db; background: #e6f0fa; padding: 4px 10px; border-radius: 999px; }
                .cat-first-hint { font-size: 12px; color: #9aa8bb; font-weight: 500; }
                .cat-first-grid { display: flex; flex-wrap: wrap; gap: 8px; }
                .cat-first-card {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 10px 16px; border: 1px solid #e5eaef; border-radius: 10px;
                    background: #fff; cursor: pointer; transition: all 0.15s;
                    font-size: 13px; font-weight: 600; color: #2A3547; font-family: inherit;
                }
                .cat-first-card:hover { border-color: #0085db; background: #f0f7ff; }
                .cat-first-card.active { border-color: #0085db; background: #e6f0fa; color: #0085db; }
                .cat-first-img { width: 24px; height: 24px; border-radius: 6px; overflow: hidden; flex-shrink: 0; }
                .cat-first-img img { width: 100%; height: 100%; object-fit: cover; }
                .cat-first-name { line-height: 1.3; }
                .cat-first-check { margin-left: auto; color: #0085db; font-weight: 800; }
                .cat-first-note { font-size: 11px; color: #9aa8bb; margin: 12px 0 0; }
                .cat-first-note a { font-weight: 600; }

                @media (max-width: 1100px) {
                    .grid-main { grid-template-columns: minmax(0, 1fr); }
                }
                @media (max-width: 640px) {
                    .grid-2 { grid-template-columns: minmax(0, 1fr); }
                    .attr-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 40px; gap: 8px; }
                    .card-head { padding: 16px; }
                    .card-body { padding: 0 16px 16px; }
                    .footer-actions { flex-wrap: wrap; padding: 12px; }
                    .footer-hint { flex-basis: 100%; }
                }
            `}</style>
        </form>
    );
}
