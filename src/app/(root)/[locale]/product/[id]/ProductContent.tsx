"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Link } from '@/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useTranslations } from 'next-intl';
import { Star, ShoppingCart, Share2, User as UserIcon, ChevronDown, ChevronUp, Check, Truck, Play, Gift, AlertTriangle, X, Minus, Plus, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard/ProductCard';
import { discountPercent, hasRealDiscount } from '@/lib/product-discount';
import styles from './page.module.css';

interface Review {
    id: string;
    rating: number;
    comment: string;
    user: { name: string; image: string; };
    createdAt: string;
    adminReply?: string;
}

interface Product {
    id: string;
    title: string;
    price: number;
    oldPrice?: number;
    discount?: number;
    discountType?: string;
    images: string[];
    specs?: Record<string, string | string[]>;
    description?: string;
    brand?: string;
    reviewsCount: number;
    rating: number;
    stock: number;
    reviews?: Review[];
    status?: string;
    isNew?: boolean;
    freeDelivery?: boolean;
    hasVideo?: boolean;
    hasGift?: boolean;
    showLowStock?: boolean;
    allowInstallment?: boolean;
    category?: string;
    categorySlug?: string;
    categoryId?: string;
    fulfillmentType?: string;
}

export default function ProductContent({ initialProduct = null }: { initialProduct?: Product | null }) {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(initialProduct);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const { addToCart } = useCartStore();
    const [loading, setLoading] = useState(initialProduct ? false : true);
    const [buying, setBuying] = useState<'cart' | 'buy' | null>(null);
    const tProduct = useTranslations('Product');
    const tHeader = useTranslations('Header');
    const tMarketing = useTranslations('Marketing');
    const tChina = useTranslations('ChinaOrder');

    // Separate selections (arrays) from static specs (strings)
    const [selections, setSelections] = useState<[string, string[]][]>([]);
    const [staticSpecs, setStaticSpecs] = useState<[string, string][]>([]);

    // Review Form State
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Accordion State
    const [isDescOpen, setIsDescOpen] = useState(false);
    const [isSpecsOpen, setIsSpecsOpen] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Quantity + Lightbox + Related
    const [quantity, setQuantity] = useState(1);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const lightboxCloseRef = useRef<HTMLButtonElement>(null);
    const galleryTriggerRef = useRef<HTMLButtonElement>(null);

    // Lightbox: focus close tugmasiga, Escape bilan yopiladi, yopilganda fokus qaytadi
    useEffect(() => {
        if (lightboxOpen) {
            lightboxCloseRef.current?.focus();
            const handler = (e: KeyboardEvent) => {
                if (e.key === 'Escape') setLightboxOpen(false);
            };
            document.addEventListener('keydown', handler);
            return () => document.removeEventListener('keydown', handler);
        }
        galleryTriggerRef.current?.focus();
    }, [lightboxOpen]);
    const [related, setRelated] = useState<any[]>([]);
    const touchStartX = useRef<number | null>(null);

    // Mobile gallery swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 50) return;
        const images = product?.images || [];
        if (images.length <= 1) return;
        if (delta < 0) setActiveImage(prev => (prev + 1) % images.length);
        else setActiveImage(prev => (prev - 1 + images.length) % images.length);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sectionRef.current && !sectionRef.current.contains(event.target as Node)) {
                setIsDescOpen(false);
                setIsSpecsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDesc = () => {
        setIsDescOpen(!isDescOpen);
        if (!isDescOpen) setIsSpecsOpen(false);
    };

    const toggleSpecs = () => {
        setIsSpecsOpen(!isSpecsOpen);
        if (!isSpecsOpen) setIsDescOpen(false);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: userRating, comment: userComment, productId: id })
            });

            if (res.status === 401) {
                toast.error(tProduct('login_required'));
            } else if (res.ok) {
                toast.success(tProduct('review_success'));
                setUserComment("");
                setUserRating(5);
            } else {
                const d = await res.json();
                toast.error(d.error || "Xatolik yuz berdi");
            }
        } catch (err) {
            toast.error("Xatolik");
        } finally {
            setSubmittingReview(false);
        }
    };

    // Specs/attributes'dan tanlanadigan variantlar va static xususiyatlarni ajratadi
    const parseSpecs = (data: Product) => {
        const specsSource = (data as any).specs || (data as any).attributes;
        let parsedSpecs: Record<string, string | string[]> | null = null;

        if (typeof specsSource === 'string') {
            try { parsedSpecs = JSON.parse(specsSource); } catch (e) { console.error("Specs parse error", e); }
        } else if (typeof specsSource === 'object') {
            parsedSpecs = specsSource;
        }

        if (parsedSpecs) {
            const sels: [string, string[]][] = [];
            const stats: [string, string][] = [];
            const marketingKeys = ['isNew', 'freeDelivery', 'hasVideo', 'hasGift', 'showLowStock', 'allowInstallment'];

            Object.entries(parsedSpecs).forEach(([key, value]) => {
                if (marketingKeys.includes(key)) return;

                if (Array.isArray(value) && value.length > 1) {
                    sels.push([key, value]);
                    setSelectedOptions(prev => {
                        if (prev[key]) return prev;
                        return { ...prev, [key]: value[0] };
                    });
                } else {
                    const valStr = Array.isArray(value) ? value[0] : String(value);
                    if (valStr) stats.push([key, valStr]);
                }
            });
            setSelections(sels);
            setStaticSpecs(stats);
        }
    };

    // Serverdan initialProduct kelganda ham spec'lar parse qilinishi kerak
    useEffect(() => {
        if (initialProduct) {
            parseSpecs(initialProduct);
        }
    }, []);

    // Faqat initialProduct bo'lmasa client'dan fetch qilinadi (double-fetch oldini olish)
    useEffect(() => {
        if (initialProduct || !id) return;

        fetch(`/api/products/${id}`)
            .then(async res => {
                if (res.status === 404) return { error: 'Not found' };
                if (!res.ok) {
                    console.error("Product fetch error status:", res.status);
                    return { error: 'Server error' };
                }
                return res.json();
            })
            .then(data => {
                if (data.error) {
                    setProduct(null);
                } else {
                    // Ensure images array exists
                    if (!data.images && data.image) {
                        data.images = [data.image];
                    } else if (!data.images) {
                        data.images = [];
                    }
                    setProduct(data);
                    setQuantity(1);
                    parseSpecs(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch product:", err);
                setProduct(null);
                setLoading(false);
            });
    }, [id, initialProduct]);

    // Related products — same category, excluding current
    useEffect(() => {
        if (!product?.categoryId) return;
        fetch(`/api/products?categoryId=${product.categoryId}&exclude=${product.id}`)
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d)) setRelated(d);
            })
            .catch(() => { });
    }, [product?.categoryId, product?.id]);

    const maxQty = Math.max(1, product?.stock ?? 1);
    const changeQty = (delta: number) => {
        setQuantity(q => Math.min(maxQty, Math.max(1, q + delta)));
    };

    const handleAddToCart = () => {
        if (product) {
            const variant = selections.length > 0 ? JSON.stringify(selectedOptions) : undefined;
            addToCart({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images[0],
                hasDiscount: !!product.oldPrice || !!product.discount,
                discountType: product.discountType || ((!!product.oldPrice || !!product.discount) ? 'SALE' : undefined),
                oldPrice: product.oldPrice,
                variant,
                fulfillmentType: product.fulfillmentType === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL',
            }, false, quantity);
            toast.success(product.title + ' - ' + tHeader('savatcha'));
        }
    };

    const handleBuyNow = async () => {
        if (product) {
            setBuying('buy');
            const variant = selections.length > 0 ? JSON.stringify(selectedOptions) : undefined;
            addToCart({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images[0],
                hasDiscount: !!product.oldPrice || !!product.discount,
                discountType: product.discountType || ((!!product.oldPrice || !!product.discount) ? 'SALE' : undefined),
                oldPrice: product.oldPrice,
                variant,
                fulfillmentType: product.fulfillmentType === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL',
            }, false, quantity);
            await router.push('/checkout');
            setBuying(null);
        }
    };

    const handleShare = async () => {
        if (!product) return;
        const shareUrl = window.location.href;
        const shareData = {
            title: product.title,
            url: shareUrl,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success(tProduct('link_copied') || "Havola nusxalandi");
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error("Error sharing:", err);
            }
        }
    };

    const handleOptionSelect = (key: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return <div className="container" style={{ padding: '80px', textAlign: 'center' }}><div className="loader"></div></div>;
    if (!product) return <div className="container" style={{ padding: '40px' }}>{tProduct('not_found')}</div>;

    // Kartadagi bilan bir xil mantiq: chegirma faqat admin uni belgilaganda
    // ko'rinadi, eski narxning o'zi chegirma e'lon qilmaydi
    const showDiscount = hasRealDiscount(product);
    const discountPercentage = discountPercent(product);

    const discountType = product.discountType;
    const isCampaignSticker = discountType === 'HOT' || discountType === 'PROMO';
    const isOutOfStock = product.stock <= 0 || ['inactive', 'draft'].includes(product.status?.toLowerCase() || '');
    const isLowStock = !isOutOfStock && product.stock < 10;
    const isChina = product.fulfillmentType === 'CHINA_ORDER';

    const activeImg = product.images?.[activeImage] || product.images?.[0] || "https://placehold.co/400";

    return (
        <div className="container" style={{ paddingBottom: '180px' }}>
            {/* Breadcrumb */}
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <Link href="/" className={styles.crumbLink}>{tHeader('bosh_sahifa')}</Link>
                <span className={styles.crumbSep}>/</span>
                {product.categorySlug && product.category ? (
                    <>
                        <Link href={`/category/${product.categorySlug}`} className={styles.crumbLink}>{product.category}</Link>
                        <span className={styles.crumbSep}>/</span>
                    </>
                ) : (
                    <span className={styles.crumbSep} style={{ visibility: 'hidden' }}>/</span>
                )}
                <span className={styles.crumbCurrent}>{product.title}</span>
            </nav>

            <div className={styles.productGrid}>
                {/* Left: Gallery */}
                <div className={styles.gallerySection}>
                    <div className={styles.thumbnails}>
                        {product.images?.map((img, i) => (
                            <div
                                key={i}
                                className={`${styles.thumbItem} ${i === activeImage ? styles.thumbActive : ''}`}
                                onMouseEnter={() => setActiveImage(i)}
                                onClick={() => setActiveImage(i)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveImage(i); } }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Rasm ${i + 1}`}
                            >
                                <img
                                    src={img}
                                    alt=""
                                    loading="lazy"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className={styles.mainImageArea}>
                        <button
                            type="button"
                            ref={galleryTriggerRef}
                            className={styles.mainImgBtn}
                            onClick={() => setLightboxOpen(true)}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            aria-label={tProduct('zoom_hint') || 'Rasmni kattalashtirish'}
                        >
                            {!imgError ? (
                                <Image
                                    src={activeImg}
                                    alt={product.title}
                                    width={500}
                                    height={500}
                                    sizes="(max-width: 768px) 100vw, 500px"
                                    priority
                                    onError={() => setImgError(true)}
                                    className={styles.mainImg}
                                />
                            ) : (
                                <div className={`${styles.mainImg} flex flex-col items-center justify-center gap-2 text-slate-300`}>
                                    <Image
                                        src="https://placehold.co/400x400?text=No+Image"
                                        alt={product.title}
                                        width={400}
                                        height={400}
                                        className="opacity-60"
                                    />
                                </div>
                            )}
                        </button>

                        {/* Top Left: Promotion Stickers — faqat HOT/PROMO; oddiy % chegirma lenta bilan */}
                        <div className={styles.badgeContainer}>
                            {isCampaignSticker && (
                                <div className={`${styles.promoSticker} ${discountType === 'HOT' ? styles.promoHot : styles.promoPromo}`}>
                                    {tMarketing(discountType!.toLowerCase())}
                                </div>
                            )}
                            {!isChina && product.freeDelivery && (
                                <div className={`${styles.promoSticker} ${styles.promoPromo}`}>
                                    <Truck size={14} className="mr-2" /> {tMarketing('freeDelivery')}
                                </div>
                            )}
                            {product.hasGift && (
                                <div className={`${styles.promoSticker} ${styles.promoHot}`}>
                                    <Gift size={14} className="mr-2" /> {tMarketing('hasGift')}
                                </div>
                            )}
                        </div>

                        {/* Video Badge */}
                        {product.hasVideo && (
                            <button
                                type="button"
                                className={styles.videoBadge}
                                onClick={() => toast.info(tProduct('video_soon'))}
                                aria-label={tProduct('video_soon')}
                            >
                                <Play size={24} fill="currentColor" />
                            </button>
                        )}

                        {/* Top Right: Discount Tag */}
                        {discountPercentage > 0 && (
                            <div className={styles.discountTag}>
                                <b className={styles.discountValue}>-{discountPercentage}%</b>
                                <span className={styles.discountWord}>{tMarketing('chegirma')}</span>
                            </div>
                        )}

                        {/* Bottom Left: New Arrival */}
                        {product.isNew === true && (
                            <div className={styles.newArrival}>
                                {tMarketing('isNew')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Info */}
                <div className={styles.infoSection}>
                    <div className={styles.headerRow}>
                        <div className={styles.ratingRow}>
                            {product.reviewsCount > 0 ? (
                                <>
                                    <div style={{ display: 'flex', gap: '2px', marginRight: '10px' }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star key={i} size={16} className={`${i <= (product.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"} ${styles.starIcon}`} />
                                        ))}
                                    </div>
                                    <span style={{ color: '#666' }}>({product.reviewsCount} {tProduct('reviews')})</span>
                                </>
                            ) : (
                                <span className={styles.noReviewsHint}>{tProduct('no_reviews_short') || 'Hozircha sharhlar yo\'q'}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {product.showLowStock && !isOutOfStock && isLowStock && (
                                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <AlertTriangle size={14} /> {tMarketing('showLowStock')}
                                </div>
                            )}
                            <button className={styles.shareBtn} onClick={handleShare} aria-label={tProduct('share') || 'Ulashish'}>
                                <Share2 size={20} />
                            </button>
                        </div>
                    </div>

                    <h1 className={styles.productTitle}>{product.title}</h1>

                    <div className={styles.priceSection}>
                        {showDiscount && product.oldPrice && product.oldPrice > product.price && (
                            <div className={styles.oldPriceSect}>
                                <span className={styles.oldPriceVal}>{product.oldPrice.toLocaleString()} {tHeader('som')}</span>
                                <span className={styles.saveBadge}>
                                    {tProduct('benefit')}: {(product.oldPrice - product.price).toLocaleString()} {tHeader('som')}
                                </span>
                            </div>
                        )}
                        <div className={styles.mainPrice}>{product.price.toLocaleString()} {tHeader('som')}</div>

                        {isChina && (
                            <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100" role="region" aria-label={tChina('badge_full')}>
                                <div className="text-red-700 text-sm font-black mb-1">{tChina('badge_full')}</div>
                                <div className="text-red-600 text-xs leading-relaxed space-y-0.5">
                                    <div>{tChina('prepaid_100')}.</div>
                                    <div>{tChina('cargo_separate')}.</div>
                                </div>
                            </div>
                        )}

                        {product.allowInstallment && (
                            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                                <div>
                                    <div className="text-amber-800 text-sm font-bold">{tMarketing('allowInstallment')}</div>
                                    <div className="text-amber-600 text-xs mt-1">{tMarketing('installment_period')}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black text-amber-700">{Math.round(product.price / 12).toLocaleString()} {tHeader('som')}</div>
                                    <div className="text-[10px] text-amber-500 font-medium">{tMarketing('oyiga')} / {tMarketing('dan')}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.metaInfo}>
                        {/* Brand */}
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>{tProduct('brand')}:</span>
                            <div className={styles.metaDots}></div>
                            <span className={styles.metaValue}>{product.brand || "Hadaf Market"}</span>
                        </div>

                        {/* Stock */}
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>{tProduct('holati')}:</span>
                            <div className={styles.metaDots}></div>
                            <div className={isOutOfStock ? `${styles.stockStatus} ${styles.stockOut}` : isLowStock ? `${styles.stockStatus} ${styles.stockLow}` : styles.stockStatus}>
                                {isOutOfStock ? (
                                    <>
                                        <div className={styles.greenDot} style={{ backgroundColor: '#9e9e9e' }}></div>
                                        {tProduct('out_of_stock')}
                                    </>
                                ) : isLowStock ? (
                                    <>
                                        <div className={styles.greenDot} style={{ backgroundColor: '#f59e0b' }}></div>
                                        {tMarketing('kam_qoldi')}
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.greenDot}></div>
                                        {tProduct('in_stock')}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Delivery / Cargo */}
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>{tProduct('delivery_info')}:</span>
                            <div className={styles.metaDots}></div>
                            <span className={styles.metaValue}>
                                {isChina ? (
                                    <span className="text-red-600 font-bold">{tChina('cargo_later')}</span>
                                ) : product.freeDelivery ? (
                                    <span className="text-emerald-600 font-bold">{tProduct('delivery_free')}</span>
                                ) : (
                                    tProduct('delivery_calculated')
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className={styles.qtyBlock}>
                        <span className={styles.qtyLabel}>{tProduct('quantity')}</span>
                        <div className={styles.qtyStepper}>
                            <button
                                type="button"
                                className={styles.qtyBtn}
                                onClick={() => changeQty(-1)}
                                disabled={quantity <= 1}
                                aria-label="−"
                            >
                                <Minus size={16} />
                            </button>
                            <span className={styles.qtyValue}>{quantity}</span>
                            <button
                                type="button"
                                className={styles.qtyBtn}
                                onClick={() => changeQty(1)}
                                disabled={quantity >= maxQty || isOutOfStock}
                                aria-label="+"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className={styles.desktopActions}>
                        <button className={styles.btnCart} onClick={handleAddToCart} disabled={isOutOfStock} aria-label={tProduct('add_to_cart')}>
                            <ShoppingCart size={22} strokeWidth={2.5} />
                            {tProduct('add_to_cart')}
                        </button>
                        <button className={styles.btnBuy} onClick={handleBuyNow} disabled={isOutOfStock || buying === 'buy'}>
                            {buying === 'buy' ? tHeader('loading') : tProduct('buy_one_click')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Accordion: Description + Specs */}
            <div ref={sectionRef}>
                <div id="desc" className={styles.sectionBlock}>
                    <div
                        onClick={toggleDesc}
                        className={`${styles.sectionHeader} ${isDescOpen ? styles.sectionHeaderOpen : ''}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDesc(); } }}
                    >
                        <h2>{tHeader('batafsil')}</h2>
                        {isDescOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>

                    {isDescOpen && (
                        <div className={`${styles.accordionBody} animate-in slide-in-from-top-2`}>
                            <p className={styles.descText}>{product.description || tProduct('no_info')}</p>
                        </div>
                    )}
                </div>

                <div id="specs" className={styles.sectionBlock}>
                    <div
                        onClick={toggleSpecs}
                        className={`${styles.sectionHeader} ${isSpecsOpen ? styles.sectionHeaderOpen : ''}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSpecs(); } }}
                    >
                        <h2>{tProduct('main_characteristics')}</h2>
                        {isSpecsOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>

                    {isSpecsOpen && (
                        <div className={`${styles.accordionBody} animate-in slide-in-from-top-2`}>
                            {/* Selections (interactive options) */}
                            {selections.map(([key, options]) => (
                                <div key={key} className={styles.specGroup}>
                                    <span className={styles.specGroupLabel}>{key}</span>
                                    <div className={styles.toggleGroup}>
                                        {options.map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => handleOptionSelect(key, opt)}
                                                className={`${styles.toggleBtn} ${selectedOptions[key] === opt ? styles.toggleBtnActive : ''}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Static Specs */}
                            {staticSpecs.length > 0 && (
                                <div className={styles.specsGrid}>
                                    {staticSpecs.map(([key, value]) => (
                                        <div key={key} className={styles.specRowDiv}>
                                            <span className={styles.specKey}>{key}</span>
                                            <span className={styles.specVal}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!staticSpecs.length && !selections.length && <p className={styles.noInfo}>{tProduct('no_info')}</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Reviews */}
            <div id="reviews" className={styles.sectionBlock}>
                <h2>{tProduct('reviews_tab')} ({product.reviewsCount})</h2>

                <div className={styles.reviewsList}>
                    {product.reviews && product.reviews.length > 0 ? (
                        product.reviews.map(review => (
                            <div key={review.id} className={styles.reviewItem}>
                                <div className={styles.reviewHeader}>
                                    <div className={styles.reviewUser}>
                                        <div className={styles.reviewAvatar}>
                                            {review.user?.image ? (
                                                <img alt="Rasm" src={review.user.image} className={styles.reviewAvatarImg} />
                                            ) : (
                                                <UserIcon size={20} color="#666" />
                                            )}
                                        </div>
                                        <div>
                                            <div className={styles.reviewName}>{review.user?.name || "Foydalanuvchi"}</div>
                                            <div className={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={16} className={styles.starIcon} fill={i < review.rating ? "#ffc107" : "#eee"} color={i < review.rating ? "#ffc107" : "#eee"} />
                                        ))}
                                    </div>
                                </div>
                                <p className={styles.reviewComment}>{review.comment}</p>
                                {review.adminReply && (
                                    <div className={styles.adminReply}>
                                        <div className={styles.adminReplyHead}>
                                            <div className={styles.adminReplyName}>{tProduct('admin_response')}</div>
                                            <Check size={14} className="text-blue-600" />
                                        </div>
                                        <p className={styles.adminReplyText}>{review.adminReply}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className={styles.noReviews}>{tProduct('no_reviews')}</p>
                    )}
                </div>

                {/* Add Review Form */}
                <div className={styles.reviewForm}>
                    <h3 className={styles.reviewFormTitle}>{tProduct('add_review')}</h3>
                    <form onSubmit={handleSubmitReview}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{tProduct('your_rating')}</label>
                            <div className={styles.ratingPicker}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setUserRating(star)}
                                        className={`${styles.ratingBtn} hover:scale-110`}
                                        aria-label={`${star} yulduz`}
                                    >
                                        <Star size={32} className={styles.ratingStar} fill={star <= userRating ? "#ffc107" : "#f3f4f6"} color={star <= userRating ? "#ffc107" : "#d1d5db"} strokeWidth={1.5} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{tProduct('your_review')}</label>
                            <textarea
                                value={userComment}
                                onChange={e => setUserComment(e.target.value)}
                                required
                                rows={5}
                                className={styles.reviewTextarea}
                                placeholder={tProduct('review_placeholder')}
                            />
                        </div>
                        <button type="submit" disabled={submittingReview} className={styles.submitBtn}>
                            {submittingReview ? tProduct('submitting') : tProduct('submit')}
                        </button>
                    </form>
                </div>
            </div>

            {/* Related Products */}
            {related.length > 0 && (
                <div className={styles.relatedSection}>
                    <h2 className={styles.relatedTitle}>{tProduct('related_products')}</h2>
                    <div className={styles.relatedGrid}>
                        {related.map(p => (
                            <ProductCard
                                key={p.id}
                                id={p.id}
                                title={p.title}
                                price={p.price}
                                oldPrice={p.oldPrice}
                                image={p.image || (p.images && p.images[0]) || "https://placehold.co/400"}
                                discount={p.discount}
                                discountType={p.discountType}
                                freeDelivery={p.freeDelivery}
                                hasVideo={p.hasVideo}
                                hasGift={p.hasGift}
                                showLowStock={p.showLowStock}
                                allowInstallment={p.allowInstallment}
                                stock={p.stock}
                                rating={p.rating}
                                reviewCount={p.reviewsCount}
                                fulfillmentType={p.fulfillmentType}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxOpen && (
                <div className={styles.lightbox} onClick={() => setLightboxOpen(false)} role="dialog" aria-modal="true" aria-label={product.title}>
                    <button
                        type="button"
                        ref={lightboxCloseRef}
                        className={styles.lightboxClose}
                        onClick={() => setLightboxOpen(false)}
                        aria-label={tProduct('close')}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={activeImg}
                        alt={product.title}
                        className={styles.lightboxImg}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Sticky Mobile/Bottom Actions */}
            <div className={styles.stickyBar}>
                <div className={styles.stickyBarContainer}>
                    <div className={styles.stickyQty}>
                        <button type="button" className={styles.stickyQtyBtn} onClick={() => changeQty(-1)} disabled={quantity <= 1} aria-label="−"><Minus size={14} /></button>
                        <span className={styles.stickyQtyVal}>{quantity}</span>
                        <button type="button" className={styles.stickyQtyBtn} onClick={() => changeQty(1)} disabled={quantity >= maxQty || isOutOfStock} aria-label="+"><Plus size={14} /></button>
                    </div>
                    <button title="Savatchaga qo'shish" className={styles.stickyBtnCart} onClick={handleAddToCart} disabled={isOutOfStock}>
                        <ShoppingCart size={20} strokeWidth={2.5} />
                        <span>{tProduct('add_to_cart')}</span>
                    </button>
                    <button title="Hozir xarid qilish" className={styles.stickyBtnBuy} onClick={handleBuyNow} disabled={isOutOfStock || buying === 'buy'}>
                        {buying === 'buy' ? tHeader('loading') : tProduct('buy_one_click')}
                    </button>
                </div>
            </div>
        </div>
    );
}
