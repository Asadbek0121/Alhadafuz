"use client";

import { ChevronRight, ChevronLeft, Clock, TrendingUp, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@/navigation';
import Image from 'next/image';
import styles from './Hero.module.css';

const DEFAULT_COUNTDOWN = 24 * 60 * 60 * 1000; // 24h fallback

/**
 * Yon banner tugash vaqtini banner ro'yxatidan ajratib oladi.
 *
 * Server ham, klient ham bir xil props'dan bir xil natija chiqaradi, shu
 * sababli countdown bloki birinchi render'dan boshlab joyida bo'ladi.
 * Ilgari bu qiymat faqat klient tomonidagi /api/banners javobidan keyin
 * o'rnatilardi — natijada blok keyinroq paydo bo'lib, pastdagi butun
 * kontentni surib yuborardi (CLS'ning asosiy sababi).
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
    const [timeLeft, setTimeLeft] = useState(DEFAULT_COUNTDOWN);
    // Serverdan kelgan banner'lardan darhol hisoblanadi — fetch'ni kutmaydi
    const [countdownEnd, setCountdownEnd] = useState<number | null>(() => findCountdownEnd(initialBanners));
    const [isMounted, setIsMounted] = useState(false);
    const [imageError, setImageError] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Mount Logic (faqat countdown kabi client-ga bog'liq qismlar uchun)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/banners');
            if (res.ok) {
                const data = await res.json();
                setBanners(data);

                // Identify side banner for countdown
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

    // Server allaqachon getCachedBanners() orqali banner'larni bergan bo'lsa,
    // /api/banners aynan shu funksiyani va shu keshni (revalidate: 3600)
    // chaqiradi — ya'ni bir xil ma'lumot. Shu sababli so'rov faqat server
    // bo'sh qaytargan holatda (masalan DB xatosi) zaxira sifatida yuboriladi.
    useEffect(() => {
        if (initialBanners.length > 0) return;
        fetchData();
    }, [fetchData, initialBanners.length]);

    // Countdown Ticker (runs only while a side banner with an end date is active)
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

        // Cap hours to 99 for clean UI if it's too large
        if (h > 99) h = 99;

        return { h, m, s };
    };

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);

    const mainBanners = banners.filter(b => b.position === 'HOME_TOP' && b.isActive !== false);
    const sideBanner = banners.find(b => b.position === 'HOME_SIDE' && b.isActive !== false);
    const isFallbackMode = mainBanners.length === 0 && fallbackProducts.length > 0;

    const hasCountdown = countdownEnd !== null;
    const isExpired = hasCountdown && timeLeft <= 0;
    const hotDealHref = sideBanner?.productId ? `/product/${sideBanner.productId}` : (sideBanner?.link || '/');
    const visibleBannerId = mainBanners[currentIndex]?.id;

    // Track impressions of the visible main banner (once per slide view)
    useEffect(() => {
        if (!isMounted || loading || !visibleBannerId) return;
        fetch(`/api/admin/banners/${visibleBannerId}/impression`, { method: 'POST' }).catch(() => { });
    }, [currentIndex, isMounted, loading, visibleBannerId]);

    const trackBannerClick = (bannerId?: string) => {
        if (!bannerId) return;
        fetch(`/api/admin/banners/${bannerId}/click`, { method: 'POST' }).catch(() => { });
    };

    // Auto-play
    useEffect(() => {
        if (mainBanners.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [mainBanners.length]);

    const { h, m, s } = formatTime(timeLeft);

    return (
        <div className={styles.heroWrapper}>
            <div className={`container ${styles.heroContent} ${isFallbackMode ? styles.fallbackLayout : ''}`}>
                {/* 1. Main Premium Slider */}
                <div className={styles.sliderContainer}>
                    {loading ? (
                        <div className="animate-pulse bg-gray-100 w-full h-full"></div>
                    ) : mainBanners.length === 0 && fallbackProducts.length > 0 ? (
                        /* Empty slider fallback: products carousel when no HOME_TOP banners exist */
                        <div className={styles.fallbackCarousel}>
                            <div className={styles.fallbackHeader}>
                                <h3 className={styles.fallbackTitle}>{t('ommabop')}</h3>
                                <span className={styles.fallbackHint}>suring →</span>
                            </div>
                            <div className={`${styles.fallbackTrack} ${fallbackProducts.length <= 2 ? styles.fallbackTrackCentered : ''}`}>
                                {fallbackProducts.slice(0, 12).map((p) => (
                                    <Link key={p.id} href={`/product/${p.id}`} className={styles.fallbackCard}>
                                        <div className={styles.fallbackImageWrap}>
                                            <Image
                                                src={p.image || "https://placehold.co/400"}
                                                alt={p.title}
                                                fill
                                                sizes="150px"
                                                className="object-contain"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.srcset = "";
                                                    target.src = "https://placehold.co/400?text=No+Image";
                                                }}
                                            />
                                        </div>
                                        <div className={styles.fallbackName}>{p.title}</div>
                                        <div>
                                            {p.oldPrice && p.oldPrice > p.price && (
                                                <div className={styles.fallbackOldPrice}>{p.oldPrice.toLocaleString()} {tCommon('som')}</div>
                                            )}
                                            <div className={styles.fallbackPrice}>{p.price.toLocaleString()} {tCommon('som')}</div>
                                        </div>
                                    </Link>
                                ))}
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
                                <div className={styles.sliderDots}>
                                    {mainBanners.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentIndex(i)}
                                            className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`}
                                            title={`Slayd ${i + 1}`}
                                            aria-label={`${i + 1}-slaydga o'tish`}
                                        />
                                    ))}
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
                        <div className="w-full h-full flex flex-col">
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
                                    {/* Tuzilma serverda ham render bo'ladi (isMounted bilan
                                        o'ralmagan) — shu sababli joy band bo'lib turadi va
                                        hidratsiyadan keyin hech narsa siljimaydi. Faqat
                                        raqamlar mount'dan keyin to'ladi: server va brauzer
                                        vaqti farq qiladi, aks holda hidratsiya xatosi bo'ladi.
                                        .timeBox 30x30px belgilangani uchun `--` va `08` bir
                                        xil joy egallaydi. */}
                                    {hasCountdown && !isExpired && (
                                        <>
                                        <div className={styles.countdownHead}>
                                            <Clock size={18} className={styles.countdownIcon} />
                                            {t('tugash')}
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
                                        </>
                                    )}
                                    {isExpired && (
                                        <div className={styles.expiredBadge}>{t('tugadi')}</div>
                                    )}
                                    <h3 className={styles.hotDealTitle}>
                                        {sideBanner?.title || "Limited Edition"}
                                    </h3>
                                    <div className={styles.priceContainer}>
                                        {sideBanner?.oldPrice && (
                                            <div className={styles.oldPrice}>
                                                {sideBanner.oldPrice.toLocaleString()} {tCommon('som')}
                                            </div>
                                        )}
                                        <div className={styles.promoPrice}>
                                            {sideBanner?.price?.toLocaleString() || "0"} <span className={styles.currency}>{tCommon('som')}</span>
                                        </div>
                                    </div>
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
                    )}
                </div>
            </div>
        </div>
    );
}
