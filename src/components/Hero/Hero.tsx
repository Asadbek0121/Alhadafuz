"use client";

import { ChevronRight, ChevronLeft, Clock, TrendingUp, ShoppingCart, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Link } from '@/navigation';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import AutoPlay from 'embla-carousel-autoplay';
import styles from './Hero.module.css';

const DEFAULT_COUNTDOWN = 24 * 60 * 60 * 1000; // 24h fallback

/**
 * Yon banner tugash vaqtini banner ro'yxatidan ajratib oladi.
 */
function findCountdownEnd(list: any[]): number | null {
    const side = list.find((b: any) => b.position === 'HOME_SIDE' && b.isActive !== false);
    if (!side?.endDate) return null;
    return new Date(side.endDate).getTime();
}

interface FallbackProduct {
    id: string;
    title: string;
    price: number;
    oldPrice?: number | null;
    image: string;
}

export default function Hero({ initialBanners = [], fallbackProducts = [] }: { initialBanners?: any[]; fallbackProducts?: FallbackProduct[] }) {
    const t = useTranslations('Hero');
    const tCommon = useTranslations('Header');
    const [banners, setBanners] = useState<any[]>(initialBanners);
    const [loading, setLoading] = useState(initialBanners.length === 0);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [carouselPaused, setCarouselPaused] = useState(false);
    const reduceMotion = useReducedMotion();
    const [timeLeft, setTimeLeft] = useState(DEFAULT_COUNTDOWN);
    const [countdownEnd, setCountdownEnd] = useState<number | null>(() => findCountdownEnd(initialBanners));
    const [isMounted, setIsMounted] = useState(false);
    const [imageError, setImageError] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Embla Carousel (Maxsus Takliflar) ──────────────────────────────
    const emblaRef = useRef<HTMLDivElement>(null);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
    const [emblaSelectedIndex, setEmblaSelectedIndex] = useState(0);
    const emblaAutoplayRef = useRef<any>(null);

    const EMBLA_OPTIONS = useCallback(() => ({
        align: 'start' as const,
        axis: 'x' as const,
        active: true,
        loop: true,
        skipSnaps: false,
        dragFree: false,
        duration: 500,
        startIndex: 0,
        dragThreshold: 10,
        inViewThreshold: 0.2,
        containScroll: 'trimSnaps' as const,
        watchDrag: true,
        watchResize: true,
        watchSlides: true,
        watchFocus: false,
    }), []);

    const [emblaNode, embla] = useEmblaCarousel(
        EMBLA_OPTIONS(),
        [
            AutoPlay({
                delay: 4000,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
                rootNode: (emblaRoot) => emblaRef.current,
            }),
        ]
    );

    // Restart autoplay after user interaction (touch/mouse release)
    useEffect(() => {
        if (!embla) return;
        const handlePointerUp = () => {
            if (!carouselPaused && !reduceMotion && emblaAutoplayRef.current) {
                emblaAutoplayRef.current.play();
            }
        };
        embla.on('pointerUp', handlePointerUp);
        embla.on('settle', handlePointerUp);
        return () => {
            embla.off('pointerUp', handlePointerUp);
            embla.off('settle', handlePointerUp);
        };
    }, [embla, carouselPaused, reduceMotion]);

    // Keep dots in sync with current slide
    useEffect(() => {
        if (!embla) return;
        const onSelect = () => setEmblaSelectedIndex(embla.selectedScrollSnap());
        embla.on('select', onSelect);
        return () => { embla.off('select', onSelect); };
    }, [embla]);

    // Mount + resize → recalculate snap points
    useEffect(() => {
        setIsMounted(true);
        if (!embla) return;
        const updateSnaps = () => {
            const snaps = embla.scrollSnapList();
            console.log('[Embla debug]', { snaps: snaps.length, canNext: embla.canScrollNext(), canPrev: embla.canScrollPrev(), selected: embla.selectedScrollSnap() });
            setScrollSnaps(snaps);
            setEmblaSelectedIndex(embla.selectedScrollSnap());
        };
        embla.on('init', updateSnaps);
        embla.on('reInit', updateSnaps);
        updateSnaps();
    }, [embla]);

    // Pause autoplay on hover / focus
    useEffect(() => {
        const el = emblaRef.current;
        if (!el || !embla || !emblaAutoplayRef) return;
        emblaAutoplayRef.current = embla.plugins().autoplay;
        const pause = () => { if (emblaAutoplayRef.current) emblaAutoplayRef.current.stop(); };
        const resume = () => { if (!carouselPaused && !reduceMotion && emblaAutoplayRef.current) emblaAutoplayRef.current.play(); };
        el.addEventListener('mouseenter', pause);
        el.addEventListener('mouseleave', resume);
        el.addEventListener('focusin', pause);
        el.addEventListener('blur', resume);
        return () => {
            el.removeEventListener('mouseenter', pause);
            el.removeEventListener('mouseleave', resume);
            el.removeEventListener('focusin', pause);
            el.removeEventListener('blur', resume);
        };
    }, [carouselPaused, reduceMotion]);

    // Pause autoplay when page is hidden
    useEffect(() => {
        const onChange = () => {
            if (document.hidden) {
                if (emblaAutoplayRef.current) emblaAutoplayRef.current.stop();
            } else if (!carouselPaused && !reduceMotion && emblaAutoplayRef.current) {
                emblaAutoplayRef.current.play();
            }
        };
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
    }, [carouselPaused, reduceMotion]);

    // Autoplay respects reduced-motion & global pause
    useEffect(() => {
        if (reduceMotion || carouselPaused) {
            if (emblaAutoplayRef.current) emblaAutoplayRef.current.stop();
        } else {
            if (emblaAutoplayRef.current && embla) emblaAutoplayRef.current.play();
        }
    }, [reduceMotion, carouselPaused, embla]);

    const emblaPrev = useCallback(() => embla && embla.scrollPrev(), [embla]);
    const emblaNext = useCallback(() => embla && embla.scrollNext(), [embla]);
    const emblaScrollTo = useCallback((i: number) => embla && embla.scrollTo(i), [embla]);

    const totalCarouselPages = scrollSnaps.length;
    const fallbackProductsSlice = fallbackProducts.slice(0, 12);

    // ── Data ────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/banners');
            if (res.ok) {
                const data = await res.json();
                setBanners(data);
                const target = findCountdownEnd(data);
                if (target !== null) {
                    const diff = target - new Date().getTime();
                    setCountdownEnd(target);
                    setTimeLeft(diff > 0 ? diff : 0);
                } else {
                    setCountdownEnd(null);
                }
            }
        } catch (err) {
            console.error("Banner fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialBanners.length > 0) return;
        fetchData();
    }, [fetchData, initialBanners.length]);

    useEffect(() => {
        if (countdownEnd === null) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => (prev <= 1000 ? 0 : prev - 1000));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [countdownEnd]);

    const formatTime = (ms: number) => {
        if (ms <= 0) return { h: 0, m: 0, s: 0 };
        let h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((ms % (1000 * 60)) / 1000);
        if (h > 99) h = 99;
        return { h, m, s };
    };

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);

    const mainBanners = banners.filter(b => b.position === 'HOME_TOP' && b.isActive !== false && !(b.products && b.products.length > 0));
    const sideBanner = banners.find(b => b.position === 'HOME_SIDE' && b.isActive !== false);
    const carouselBanner = banners.find(b => b.position === 'HOME_TOP' && b.isActive !== false && b.products && b.products.length > 0);
    const carouselProducts = carouselBanner?.products && carouselBanner.products.length > 0
        ? carouselBanner.products
        : fallbackProducts;
    const isFallbackMode = carouselBanner
        ? carouselProducts.length > 0
        : mainBanners.length === 0 && fallbackProducts.length > 0;

    const hasCountdown = countdownEnd !== null;
    const isExpired = hasCountdown && timeLeft <= 0;
    const hotDealHref = sideBanner?.productId ? `/product/${sideBanner.productId}` : (sideBanner?.link || '/');
    const visibleBannerId = mainBanners[currentIndex]?.id;

    // Track impressions of the visible main banner
    useEffect(() => {
        if (!isMounted || loading || !visibleBannerId) return;
        fetch(`/api/admin/banners/${visibleBannerId}/impression`, { method: 'POST' }).catch(() => { });
    }, [currentIndex, isMounted, loading, visibleBannerId]);

    // Yon banner ko'rishlari ham hisoblanadi
    useEffect(() => {
        if (!isMounted || loading || !sideBanner?.id) return;
        fetch(`/api/admin/banners/${sideBanner.id}/impression`, { method: 'POST' }).catch(() => { });
    }, [isMounted, loading, sideBanner?.id]);

    const trackBannerClick = (bannerId?: string) => {
        if (!bannerId) return;
        fetch(`/api/admin/banners/${bannerId}/click`, { method: 'POST' }).catch(() => { });
    };

    // Auto-play — prefers-reduced-motion yoki pause'da ishlamaydi
    useEffect(() => {
        if (mainBanners.length <= 1 || paused || reduceMotion) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [mainBanners.length, paused, reduceMotion]);

    const { h, m, s } = formatTime(timeLeft);

    return (
        <div className={styles.heroWrapper}>
            <div className={`container ${styles.heroContent} ${isFallbackMode ? styles.fallbackLayout : ''}`}>
                {/* 1. Main Premium Slider */}
                <div className={styles.sliderContainer} role="region" aria-roledescription="carousel" aria-label="Bannerlar">
                    {loading ? (
                        <div className="animate-pulse bg-gray-100 w-full h-full"></div>
                    ) : mainBanners.length === 0 && fallbackProducts.length > 0 ? (
                        /* Empty slider fallback: products carousel when no HOME_TOP banners exist */
                        <div className={styles.fallbackCarousel}>
                            <div className={styles.fallbackHeader}>
                                <div className={styles.fallbackSubTitle}>MAXSUS TAKLIFLAR</div>
                                <Link href="/search" className={styles.viewAllBtn}>
                                    <span className={styles.viewAllBtnFull}>Barchasini ko'rish →</span>
                                    <span className={styles.viewAllBtnShort}>Hammasi →</span>
                                </Link>
                            </div>
                            {/* Embla root — outside overflow, arrows live here */}
                            <div className={styles.emblaRoot} ref={emblaRef}>
                                {/* Arrows — positioned absolutely on emblaRoot, outside overflow:hidden */}
                                <div className={styles.emblaArrows}>
                                    <button
                                        type="button"
                                        className={styles.emblaArrow}
                                        onClick={emblaPrev}
                                        aria-label="Oldingi"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.emblaArrow}
                                        onClick={emblaNext}
                                        aria-label="Keyingi"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>

                                {/* Embla viewport — overflow:hidden */}
                                <div ref={emblaNode} className={styles.emblaViewport}>
                                    {/* Embla track — negative margin for edge slides */}
                                    <div className={styles.emblaTrack}>
                                        {fallbackProductsSlice.map((p: any) => (
                                            <div key={p.id} className={`${styles.emblaSlide} min-w-0 shrink-0 grow-0 basis-1/2 pl-2 sm:basis-1/3 sm:pl-4 lg:basis-1/4`}>
                                                <Link href={`/product/${p.slug || p.id}`} className={styles.productCard}>
                                                    {p.oldPrice && p.oldPrice > p.price && (
                                                        <div className={styles.discountBadgeCard}>
                                                            -{Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className={`${styles.favBtn} hover:text-red-500 transition-colors`}
                                                        aria-label="Sevimlilarga qo'shish"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                                        </svg>
                                                    </button>
                                                    <div className={styles.productImageWrap}>
                                                        <Image
                                                            src={p.image || "https://placehold.co/400"}
                                                            alt={p.title}
                                                            fill
                                                            className="object-contain"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.srcset = "";
                                                                target.src = "https://placehold.co/400?text=No+Image";
                                                            }}
                                                        />
                                                    </div>
                                                    <div className={styles.productName}>{p.title}</div>
                                                    <div className={styles.productPriceRow}>
                                                        <div className={styles.productPriceCell}>
                                                            {p.oldPrice && p.oldPrice > p.price && (
                                                                <div className={styles.productOldPrice}>{p.oldPrice.toLocaleString()} {tCommon('som')}</div>
                                                            )}
                                                            <div className={styles.productPrice}>{p.price.toLocaleString()} {tCommon('som')}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={styles.cartBtn}
                                                            onClick={(e) => e.stopPropagation()}
                                                            aria-label="Savatga qo'shish"
                                                        >
                                                            <ShoppingCart size={18} />
                                                        </button>
                                                    </div>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dots — show when more than 1 snap */}
                                {isMounted && totalCarouselPages > 1 && (
                                    <div className={styles.emblaDots}>
                                        {scrollSnaps.map((_, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className={`${styles.emblaDot} ${i === emblaSelectedIndex ? styles.emblaDot__selected : ''}`}
                                                onClick={() => emblaScrollTo(i)}
                                                aria-label={`${i + 1}-sahifaga o'tish`}
                                                aria-current={i === emblaSelectedIndex}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full relative">
                            <div
                                key={mainBanners.length > 0 ? mainBanners[currentIndex]?.id : 'default'}
                                className={`${styles.slider} ${styles.sliderFade}`}
                            >
                                {mainBanners.length > 0 && mainBanners[currentIndex]?.image && (
                                    <Image
                                        src={mainBanners[currentIndex].image}
                                        alt={mainBanners[currentIndex]?.title || "Banner"}
                                        fill
                                        priority={currentIndex === 0}
                                        className="object-cover"
                                        sizes="(max-width: 1024px) 100vw, (max-width: 1440px) 1200px, 1600px"
                                        quality={90}
                                    />
                                )}
                                <div className={styles.sliderOverlay}></div>
                                <div className={styles.sliderContent}>
                                    <h1 className={styles.sliderTitle}>
                                        {mainBanners[currentIndex]?.title || t('slider_title')}
                                    </h1>

                                    {mainBanners[currentIndex]?.description && (
                                        <p className={styles.sliderSubtitle}>
                                            {mainBanners[currentIndex].description}
                                        </p>
                                    )}

                                    <Link
                                        href={mainBanners[currentIndex]?.link || '/'}
                                        className={styles.sliderBtn}
                                        onClick={() => trackBannerClick(mainBanners[currentIndex]?.id)}
                                    >
                                        {tCommon('batafsil')}
                                        <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            {mainBanners.length > 1 && (
                                <div className={styles.sliderControls}>
                                    <div className={styles.sliderDots}>
                                        {mainBanners.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentIndex(i)}
                                                className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`}
                                                title={`Slayd ${i + 1}`}
                                                aria-label={`${i + 1}-slaydga o'tish`}
                                                aria-current={i === currentIndex}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setPaused(p => !p)}
                                        className={styles.pauseBtn}
                                        aria-label={paused ? "Avtomatik aylanishni davom ettirish" : "Avtomatik aylanishni to'xtatish"}
                                        aria-pressed={paused}
                                    >
                                        {paused ? <Play size={14} /> : <Pause size={14} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Special "Hot Deal" Card */}
                <div className={styles.hotDealCard}>
                    {loading ? (
                         <div className="animate-pulse bg-gray-100 w-full h-full rounded-2xl"></div>
                    ) : (
                        <div className="w-full flex flex-col" style={{ minHeight: 0 }}>
                            <div className={styles.hotDealContent}>
                                <Link
                                    href={hotDealHref}
                                    className={styles.hotDealImageLink}
                                    onClick={() => trackBannerClick(sideBanner?.id)}
                                >
                                <div className={styles.hotDealImageWrapper}>
                                    {(sideBanner?.image && !imageError) ? (
                                        <div className="w-full h-full relative">
                                            <Image
                                                src={sideBanner.image}
                                                alt={sideBanner?.title || "Hot product"}
                                                fill
                                                priority
                                                className={styles.hotDealImage}
                                                sizes="(max-width: 640px) 150px, (max-width: 1024px) 200px, 300px"
                                                onError={() => setImageError(true)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                                            <TrendingUp size={32} className="text-blue-200" />
                                        </div>
                                    )}
                                    {sideBanner?.discount && (
                                        <div className={styles.discountBadge}>
                                            {sideBanner.discount}
                                        </div>
                                    )}
                                </div>
                                </Link>

                                <div className={styles.hotDealInfo}>
                                    {hasCountdown && !isExpired && (
                                        <div className={styles.countdownRow}>
                                            <div className={styles.countdownHead}>
                                                <Clock size={14} className={styles.countdownIcon} />
                                                <span>{t('tugash')}</span>
                                            </div>
                                            <div className={styles.countdown}>
                                                <div className={styles.timeUnit}>
                                                    <div className={styles.timeBox}><span>{isMounted ? String(h).padStart(2, '0') : '--'}</span></div>
                                                    <span className={styles.timeLabel}>{t('soat')}</span>
                                                </div>
                                                <span className={styles.timeSep}>:</span>
                                                <div className={styles.timeUnit}>
                                                    <div className={styles.timeBox}><span>{isMounted ? String(m).padStart(2, '0') : '--'}</span></div>
                                                    <span className={styles.timeLabel}>{t('minut')}</span>
                                                </div>
                                                <span className={styles.timeSep}>:</span>
                                                <div className={styles.timeUnit}>
                                                    <div className={styles.timeBox}><span>{isMounted ? String(s).padStart(2, '0') : '--'}</span></div>
                                                    <span className={styles.timeLabel}>{t('sekund')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {isExpired && (
                                        <div className={styles.expiredBadge}>{t('tugadi')}</div>
                                    )}
                                    <h3 className={styles.hotDealTitle}>
                                        {sideBanner?.title || "Limited Edition"}
                                    </h3>
                                    {sideBanner?.price ? (
                                        <div className={styles.priceRow}>
                                            {sideBanner?.oldPrice && (
                                                <span className={styles.oldPrice}>
                                                    {sideBanner.oldPrice.toLocaleString()} {tCommon('som')}
                                                </span>
                                            )}
                                            <span className={styles.promoPrice}>
                                                {sideBanner.price.toLocaleString()} <span className={styles.currency}>{tCommon('som')}</span>
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className={styles.hotDealBtnWrap}>
                                        <Link
                                            href={hotDealHref}
                                            className={styles.hotDealBtn}
                                            onClick={() => trackBannerClick(sideBanner?.id)}
                                        >
                                            <ShoppingCart size={16} className="mr-2" />
                                            {tCommon('sotib_olish')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
