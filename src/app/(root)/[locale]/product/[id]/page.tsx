"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useTranslations } from 'next-intl';
import { Star, ShoppingCart, Share2, User as UserIcon, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'sonner';
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
    images: string[];
    specs?: Record<string, string | string[]>;
    description?: string;
    brand?: string;
    reviewsCount: number;
    rating: number;
    stock: number;
    reviews?: Review[];
    status?: string;
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

    // Accordion State
    const [isDescOpen, setIsDescOpen] = useState(false);
    const [isSpecsOpen, setIsSpecsOpen] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

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
                                if (Array.isArray(value) && value.length > 1) {
                                    sels.push([key, value]);
                                    // Default select first option
                                    if (value.length > 0) {
                                        setSelectedOptions(prev => ({ ...prev, [key]: value[0] }));
                                    }
                                } else {
                                    const valStr = Array.isArray(value) ? value[0] : String(value);
                                    if (valStr) stats.push([key, valStr]);
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
                        <button className={styles.shareBtn} onClick={handleShare}>
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


                    <div className={styles.metaInfo}>
                        {/* Static Specs (Model, Artikul, etc from specs) */}
                        {staticSpecs.map(([key, value]) => (
                            <div key={key} className={styles.metaRow}>
                                <span className={styles.metaLabel}>{key}:</span>
                                <div className={styles.metaDots}></div>
                                <span className={styles.metaValue}>{value}</span>
                            </div>
                        ))}

                        {/* Brand */}
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>{tProduct('brand')}:</span>
                            <div className={styles.metaDots}></div>
                            <span className={styles.metaValue}>{product.brand || "UzMarket"}</span>
                        </div>

                        {/* Stock */}
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>{tProduct('holati') || "Holati"}:</span>
                            <div className={styles.metaDots}></div>
                            <div className={styles.stockStatus}>
                                {product.status?.toLowerCase() === 'sotuvda_kam_qolgan' ? (
                                    <>
                                        <div className={styles.greenDot} style={{ backgroundColor: '#ff9800' }}></div>
                                        Sotuvda kam qolgan
                                    </>
                                ) : (product.stock > 0 && !['inactive', 'draft'].includes(product.status?.toLowerCase() || '')) ? (
                                    <>
                                        <div className={styles.greenDot}></div>
                                        Sotuvda mavjud
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.greenDot} style={{ backgroundColor: '#9e9e9e' }}></div>
                                        Sotuvda mavjud emas
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className={styles.desktopActions}>
                        <button className={styles.btnCart} onClick={handleAddToCart}>
                            <ShoppingCart size={22} strokeWidth={2.5} />
                            {tProduct('add_to_cart')}
                        </button>
                        <button className={styles.btnBuy} onClick={handleBuyNow}>
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
            {/* Tab Contents - Updated to Accordion Style */}
            <div ref={sectionRef}>
                <div id="desc" className={styles.sectionBlock}>
                    <div
                        onClick={toggleDesc}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: isDescOpen ? '20px' : '0'
                        }}
                    >
                        <h2 style={{ margin: 0 }}>{tHeader('batafsil')}</h2>
                        {isDescOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>

                    {isDescOpen && <p className="animate-in slide-in-from-top-2">{product.description || tProduct('no_info')}</p>}
                </div>

                <div id="specs" className={styles.sectionBlock}>
                    <div
                        onClick={toggleSpecs}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: isSpecsOpen ? '20px' : '0'
                        }}
                    >
                        <h2 style={{ margin: 0 }}>{tProduct('main_characteristics')}</h2>
                        {isSpecsOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>

                    {isSpecsOpen && (
                        <div className={`${styles.specsGrid} animate-in slide-in-from-top-2`}>
                            {/* Selections (Interactive Specs) */}
                            {selections.map(([key, options]) => (
                                <div key={key} className={styles.specRowDiv}>
                                    <span className={styles.specKey}>{key}</span>
                                    <span className={styles.specVal}>{selectedOptions[key] || options[0]}</span>
                                </div>
                            ))}

                            {/* Static Specs */}
                            {staticSpecs.map(([key, value]) => (
                                <div key={key} className={styles.specRowDiv}>
                                    <span className={styles.specKey}>{key}</span>
                                    <span className={styles.specVal}>{value}</span>
                                </div>
                            ))}
                            {!staticSpecs.length && !selections.length && <p style={{ color: '#888' }}>{tProduct('no_info')}</p>}
                        </div>
                    )}
                </div>
            </div>

            <div id="reviews" className={styles.sectionBlock}>
                <h2>{tProduct('reviews_tab')} ({product.reviewsCount})</h2>

                {/* Reviews List */}
                <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {product.reviews && product.reviews.length > 0 ? (
                        product.reviews.map(review => (
                            <div key={review.id} style={{ padding: '20px', background: '#f9f9f9', borderRadius: '16px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#e5e7eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {review.user?.image ? (
                                                <img src={review.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <UserIcon size={20} color="#666" />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{review.user?.name || "Foydalanuvchi"}</div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>{new Date(review.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={16} fill={i < review.rating ? "#ffc107" : "#eee"} color={i < review.rating ? "#ffc107" : "#eee"} />
                                        ))}
                                    </div>
                                </div>
                                <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#374151' }}>{review.comment}</p>
                                {review.adminReply && (
                                    <div style={{ marginTop: '15px', padding: '15px', background: '#ebf8ff', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e40af' }}>{tProduct('admin_response') || "Admin javobi"}</div>
                                            <Check size={14} className="text-blue-600" />
                                        </div>
                                        <p style={{ fontSize: '14px', color: '#1e3a8a', margin: 0 }}>{review.adminReply}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p style={{ color: '#888', fontStyle: 'italic', padding: '20px', background: '#f9f9f9', borderRadius: '12px' }}>{tProduct('no_reviews')}</p>
                    )}
                </div>

                {/* Add Review Form */}
                <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#111827' }}>{tProduct('add_review')}</h3>
                    <form onSubmit={handleSubmitReview}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 600, color: '#374151' }}>{tProduct('your_rating')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setUserRating(star)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.1s' }}
                                        className="hover:scale-110"
                                    >
                                        <Star size={32} fill={star <= userRating ? "#ffc107" : "#f3f4f6"} color={star <= userRating ? "#ffc107" : "#d1d5db"} strokeWidth={1.5} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 600, color: '#374151' }}>{tProduct('your_review')}</label>
                            <textarea
                                value={userComment}
                                onChange={e => setUserComment(e.target.value)}
                                required
                                rows={5}
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', outline: 'none', fontSize: '15px', transition: 'border-color 0.2s', resize: 'vertical' }}
                                placeholder={tProduct('review_placeholder')}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submittingReview}
                            style={{
                                padding: '14px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer',
                                opacity: submittingReview ? 0.7 : 1, fontSize: '16px', transition: 'background 0.2s', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)'
                            }}
                            className="hover:bg-blue-700"
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
                        <ShoppingCart size={20} strokeWidth={2.5} style={{ marginRight: '8px' }} />
                        <span>{tProduct('add_to_cart')}</span>
                    </button>
                    <button className={styles.stickyBtnPrimary} onClick={handleBuyNow}>
                        {tProduct('buy_one_click')}
                    </button>
                </div>
            </div>
        </div>
    );
}
