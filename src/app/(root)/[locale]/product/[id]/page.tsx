"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useTranslations } from 'next-intl';
import { Star, ShoppingCart, Share2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import styles from './page.module.css';

interface Review {
    id: string;
    rating: number;
    comment: string;
    user: { name: string; image: string; };
    createdAt: string;
}

interface Product {
    id: string;
    title: string;
    price: number;
    oldPrice?: number;
    discount?: number;
    images: string[];
    specs?: Record<string, string | string[]>;
    description?: string;
    brand?: string;
    reviewsCount: number;
    rating: number;
    stock: number;
    reviews?: Review[];
}

export default function ProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const { addToCart } = useCartStore();
    const [loading, setLoading] = useState(true);
    const tProduct = useTranslations('Product');
    const tHeader = useTranslations('Header');

    // Separate selections (arrays) from static specs (strings)
    const [selections, setSelections] = useState<[string, string[]][]>([]);
    const [staticSpecs, setStaticSpecs] = useState<[string, string][]>([]);

    // Review Form State
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: userRating, comment: userComment, productId: id })
            });

            if (res.ok) {
                toast.success(tProduct('review_success') || "Sharhingiz qabul qilindi");
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

    useEffect(() => {
        if (id) {
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

                        // Parse specs to separate selections
                        // Parse specs to separate selections
                        let specsSource = data.specs || data.attributes;
                        let parsedSpecs: Record<string, string | string[]> | null = null;

                        if (typeof specsSource === 'string') {
                            try {
                                parsedSpecs = JSON.parse(specsSource);
                            } catch (e) { console.error("Specs parse error", e); }
                        } else if (typeof specsSource === 'object') {
                            parsedSpecs = specsSource;
                        }

                        if (parsedSpecs) {
                            const sels: [string, string[]][] = [];
                            const stats: [string, string][] = [];
                            Object.entries(parsedSpecs).forEach(([key, value]) => {
                                if (Array.isArray(value)) {
                                    sels.push([key, value]);
                                    // Default select first option
                                    if (value.length > 0) {
                                        setSelectedOptions(prev => ({ ...prev, [key]: value[0] }));
                                    }
                                } else {
                                    stats.push([key, String(value)]);
                                }
                            });
                            setSelections(sels);
                            setStaticSpecs(stats);
                        }
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch product:", err);
                    setProduct(null);
                    setLoading(false);
                });
        }
    }, [id]);

    const handleAddToCart = () => {
        if (product) {
            addToCart({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images[0],
                hasDiscount: !!product.oldPrice || !!product.discount,
                discountType: (product as any).discountType || ((!!product.oldPrice || !!product.discount) ? 'SALE' : undefined)
            }, false);
            toast.success(product.title + ' - ' + tHeader('savatcha'));
        }
    };

    const handleBuyNow = () => {
        if (product) {
            addToCart({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.images[0],
                hasDiscount: !!product.oldPrice || !!product.discount,
                discountType: (product as any).discountType || ((!!product.oldPrice || !!product.discount) ? 'SALE' : undefined)
            }, false);
            router.push('/checkout');
        }
    };

    const handleOptionSelect = (key: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [key]: value }));
    };

    if (loading) return <div className="container" style={{ padding: '80px', textAlign: 'center' }}><div className="loader"></div></div>;
    if (!product) return <div className="container" style={{ padding: '40px' }}>{tProduct('not_found')}</div>;

    const discountPercentage = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            {/* Breadcrumb - could be dynamic */}
            <div style={{ padding: '15px 0', fontSize: '14px', color: '#666' }}>
                <span onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>{tHeader('bosh_sahifa')}</span> /
                <span onClick={() => router.push('/')} style={{ cursor: 'pointer', marginLeft: '5px' }}>{tHeader('mahsulotlar')}</span> /
                <span style={{ marginLeft: '5px', color: '#000' }}>{product.title}</span>
            </div>

            <div className={styles.productGrid}>
                {/* Left: Gallery */}
                <div className={styles.gallerySection}>
                    <div className={styles.thumbnails}>
                        {product.images?.map((img, i) => (
                            <div
                                key={i}
                                className={`${styles.thumbItem} ${i === activeImage ? styles.thumbActive : ''}`}
                                onMouseEnter={() => setActiveImage(i)}
                            >
                                <img src={img} alt="" />
                            </div>
                        ))}
                    </div>
                    <div className={styles.mainImageArea}>
                        <img
                            src={product.images?.[activeImage] || product.images?.[0] || "https://placehold.co/400"}
                            alt={product.title}
                            className={styles.mainImg}
                        />
                        {/* Badge examples */}
                        {product.discount && <div className={styles.discountBadge}>-{discountPercentage}%</div>}
                    </div>
                </div>

                {/* Right: Info */}
                <div className={styles.infoSection}>
                    <div className={styles.headerRow}>
                        <div className={styles.ratingRow}>
                            <Star size={16} fill="#ffc107" color="#ffc107" />
                            <span style={{ fontWeight: 600, marginLeft: '4px' }}>{product.rating || 4.9}</span>
                            <span style={{ color: '#888', marginLeft: '6px' }}>({product.reviewsCount} {tProduct('reviews')})</span>
                        </div>
                        <button className={styles.shareBtn}>
                            <Share2 size={20} />
                        </button>
                    </div>

                    <h1 className={styles.productTitle}>{product.title}</h1>

                    <div className={styles.priceSection}>
                        {product.oldPrice && (
                            <div className={styles.oldPriceSect}>
                                <span className={styles.oldPriceVal}>{product.oldPrice.toLocaleString()} {tHeader('som')}</span>
                                {product.discount && <span className={styles.saveBadge}>{tProduct('benefit')}: {product.discount.toLocaleString()} {tHeader('som')}</span>}
                            </div>
                        )}
                        <div className={styles.mainPrice}>{product.price.toLocaleString()} {tHeader('som')}</div>
                    </div>

                    {/* Dynamic Selections */}
                    {selections.map(([key, options]) => (
                        <div key={key} className={styles.selectionRow}>
                            <div className={styles.selectLabel}>{key}: <span style={{ color: '#000', fontWeight: 600 }}>{selectedOptions[key]}</span></div>
                            <div className={styles.toggleGroup}>
                                {options.map(opt => (
                                    <button
                                        key={opt}
                                        className={`${styles.toggleBtn} ${selectedOptions[key] === opt ? styles.toggleBtnActive : ''}`}
                                        onClick={() => handleOptionSelect(key, opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className={styles.metaInfo}>
                        {/* Model if exists in static specs */}
                        {staticSpecs.find(s => s[0].toLowerCase() === 'model') && (
                            <div className={styles.metaRow}>
                                <span className={styles.metaLabel}>Model:</span>
                                <span>{staticSpecs.find(s => s[0].toLowerCase() === 'model')?.[1]}</span>
                            </div>
                        )}
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>{tProduct('brand')}:</span>
                            <span>{product.brand || "UzMarket"}</span>
                        </div>
                        <div className={styles.stockStatus}>
                            <div className={styles.greenDot}></div>
                            {product.stock > 0 ? tProduct('in_stock') : tProduct('out_of_stock')} ({product.stock} {tHeader('dona')})
                        </div>
                    </div>

                    {/* Desktop Actions (Optional, but sticky is requested for bottom) */}
                    <div className={styles.desktopActions}>
                        <button className={styles.btnOutline} onClick={handleAddToCart}>
                            <ShoppingCart size={20} />
                            {tProduct('add_to_cart')}
                        </button>
                        <button className={styles.btnPrimary} onClick={handleBuyNow}>
                            {tProduct('buy_one_click')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className={styles.tabsNav} id="tabs">
                <a href="#desc" className={styles.tabLink}>{tHeader('batafsil')}</a>
                <a href="#specs" className={styles.tabLink}>{tProduct('characteristics')}</a>
                <a href="#reviews" className={styles.tabLink}>{tProduct('reviews_tab')}</a>
            </div>

            {/* Tab Contents */}
            <div id="desc" className={styles.sectionBlock}>
                <h2>{tHeader('batafsil')}</h2>
                <p>{product.description || tProduct('no_info')}</p>
            </div>

            <div id="specs" className={styles.sectionBlock}>
                <h2>{tProduct('main_characteristics')}</h2>
                <div className={styles.specsGrid}>
                    {staticSpecs.map(([key, value]) => (
                        <div key={key} className={styles.specRowDiv}>
                            <span className={styles.specKey}>{key}</span>
                            <span className={styles.specVal}>{value}</span>
                        </div>
                    ))}
                    {!staticSpecs.length && <p style={{ color: '#888' }}>{tProduct('no_info')}</p>}
                </div>
            </div>

            <div id="reviews" className={styles.sectionBlock}>
                <h2>{tProduct('reviews_tab')} ({product.reviewsCount})</h2>

                {/* Reviews List */}
                <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {product.reviews && product.reviews.length > 0 ? (
                        product.reviews.map(review => (
                            <div key={review.id} style={{ padding: '15px', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', background: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {review.user?.image ? (
                                                <img src={review.user.image} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <UserIcon size={16} color="#666" />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{review.user?.name || "Foydalanuvchi"}</div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(review.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} fill={i < review.rating ? "#ffc107" : "#eee"} color={i < review.rating ? "#ffc107" : "#eee"} />
                                        ))}
                                    </div>
                                </div>
                                <p style={{ fontSize: '14px', lineHeight: '1.5' }}>{review.comment}</p>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#888', fontStyle: 'italic' }}>{tProduct('no_reviews')}</p>
                    )}
                </div>

                {/* Add Review Form */}
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>{tProduct('add_review')}</h3>
                    <form onSubmit={handleSubmitReview}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{tProduct('your_rating')}</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setUserRating(star)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        <Star size={24} fill={star <= userRating ? "#ffc107" : "#eee"} color={star <= userRating ? "#ffc107" : "#ddd"} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>{tProduct('your_review')}</label>
                            <textarea
                                value={userComment}
                                onChange={e => setUserComment(e.target.value)}
                                required
                                rows={4}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                                placeholder={tProduct('review_placeholder')}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submittingReview}
                            style={{
                                padding: '12px 24px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                                opacity: submittingReview ? 0.7 : 1
                            }}
                        >
                            {submittingReview ? tProduct('submitting') : tProduct('submit')}
                        </button>
                    </form>
                </div>
            </div>


            {/* Sticky Mobile/Bottom Actions */}
            <div className={styles.stickyBar}>
                <div className="container" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button className={styles.stickyBtnOutline} onClick={handleAddToCart}>
                        <ShoppingCart size={20} />
                        <span style={{ marginLeft: '8px' }}>{tProduct('add_to_cart')}</span>
                    </button>
                    <button className={styles.stickyBtnPrimary} onClick={handleBuyNow}>
                        {tProduct('buy_one_click')}
                    </button>
                </div>
            </div>
        </div>
    );
}
