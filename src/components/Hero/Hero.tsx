"use client";

import { ChevronRight, ChevronLeft, Clock, TrendingUp, ShoppingCart, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
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
    const [paused, setPaused] = useState(false);
    // Foydalanuvchi motion kamaytirishni so'ragan bo'lsa autoplay ishlamaydi
    const reduceMotion = useReducedMotion();
    const [timeLeft, setTimeLeft] = useState(DEFAULT_COUNTDOWN);
    // Serverdan kelgan banner'lardan darhol hisoblanadi — fetch'ni kutmaydi
    const [countdownEnd, setCountdownEnd] = useState<number | null>(() => findCountdownEnd(initialBanners));
    const [isMounted, setIsMounted] = useState(false);
    const [imageError, setImageError] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

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

    const mainBanners = banners.filter(b => b.position === 'HOME_TOP' && b.isActive !== false && !(b.products && b.products.length > 0));
    const sideBanner = banners.find(b => b.position === 'HOME_SIDE' && b.isActive !== false);
    // HOME_TOP "Bugungi takliflar" carouseli: mahsulotlari bor banner slider
    // o'rniga carousel sifatida chiqadi. Sayt dizayni o'zgarmaydi — faqat
    // mahsulotlar manbai banner'dan keladi (admin boshqaradi).
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

    // Track impressions of the visible main banner (once per slide view)
    useEffect(() => {
        if (!isMounted || loading || !visibleBannerId) return;
        fetch(`/api/admin/banners/${visibleBannerId}/impression`, { method: 'POST' }).catch(() => { });
    }, [currentIndex, isMounted, loading, visibleBannerId]);

    // Yon banner ko'rishlari ham hisoblanadi. Ilgari faqat slider banner'i
    // uchun impression yozilgani sababli yon banner'ning CTR'i admin panelda
    // strukturaviy ravishda doim 0.0% ko'rinardi (bosishlar bor, ko'rishlar 0).
    // Slider'dan farqli — bu banner almashmaydi, shu sababli sahifaga bir marta.
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

    // Fallback products carousel auto-scroll
    useEffect(() => {
        if (carouselProducts.length <= 1 || paused || reduceMotion) return;
        const scrollInterval = setInterval(() => {
            if (trackRef.current) {
                trackRef.current.scrollLeft += 15;
            }
        }, 3000);
        return () => clearInterval(scrollInterval);
    }, [carouselProducts.length, paused, reduceMotion]);

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
                        <div className="relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">MAXSUS TAKLIFLAR</div>
                                    <h3 className="text-2xl font-bold text-gray-900">Bugungi takliflar</h3>
                                </div>
                                <button
                                    className="bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/90 transition-all"
                                    onClick={() => {}}
                                >
                                    Barchasini ko'rish →
                                </button>
                            </div>
                            <div ref={trackRef} className="flex gap-4 overflow-x-auto pb-4 scroll-snap-x-mandatory scroll-snap-type-x">
                                {carouselProducts.slice(0, 12).map((p: any) => (
                                    <Link key={p.id} href={`/product/${p.slug || p.id}`} className="flex flex-col bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200 w-[260px] h-[430px] relative">
                                        {/* Chegirma badge */}
                                        {p.oldPrice && p.oldPrice > p.price && (
                                            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">-{(Math.round((p.oldPrice - p.price) / p.price) * 100)}%</div>
                                        )}

                                        {/* Sevimlilar yurakchasi */}
                                        <button
                                            className="absolute top-3 right-16 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                                            aria-label="Savodga qo'shish"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>

                                        {/* Rasim */}
                                        <div className="flex-1 aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden mb-3">
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

                                        {/* Mahsulot nomi */}
                                        <div className="text-gray-800 font-medium text-sm line-clamp-2 mb-1">
                                            {p.title}
                                        </div>

                                        {/* Narxlar */}
                                        <div className="flex items-end gap-1">
                                            {p.oldPrice && p.oldPrice > p.price && (
                                                <div className="text-gray-400 text-xs line-through">
                                                    {p.oldPrice.toLocaleString()} {tCommon('som')}
                                                </div>
                                            )}
                                            <div className="text-blue-600 font-bold text-lg">
                                                {p.price.toLocaleString()} {tCommon('som')}
                                            </div>
                                        </div>

                                        {/* Savat tugmasi */}
                                        <button
                                            className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Savatga qo'shish
                                        </button>
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

                                    {/* Admin panelda kiritilgan tavsif — sarlavha ostidagi matn.
                                        Serverdan kelgan props'dan render bo'ladi, shu sababli
                                        hidratsiyada siljish yo'q. */}
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
                                    {/* Narx faqat admin panelda kiritilgan bo'lsa chiqadi.
                                        Ilgari `|| "0"` bo'lgani uchun narxsiz banner
                                        saytda "0 so'm" deb ko'rinardi. */}
                                    {sideBanner?.price ? (
                                        <div>
                                            {sideBanner?.oldPrice && (
                                                <div className={styles.oldPrice}>
                                                    {sideBanner.oldPrice.toLocaleString()} {tCommon('som')}
                                                </div>
                                            )}
                                            <div className={styles.promoPrice}>
                                                {sideBanner.price.toLocaleString()} <span className={styles.currency}>{tCommon('som')}</span>
                                            </div>
                                        </div>
                                    ) : null}
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
