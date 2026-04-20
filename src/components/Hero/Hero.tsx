"use client";

import { ChevronRight, ChevronLeft, Clock, Zap, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@/navigation';
import styles from './Hero.module.css';

const DEFAULT_COUNTDOWN = 24 * 60 * 60 * 1000; // 24h fallback

export default function Hero() {
    const t = useTranslations('Hero');
    const tCommon = useTranslations('Header');
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(DEFAULT_COUNTDOWN);
    const [isMounted, setIsMounted] = useState(false);
    const [imageError, setImageError] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Mount Logic
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
                const side = data.find((b: any) => b.position === 'HOME_SIDE' && b.isActive !== false);
                if (side?.endDate) {
                    const target = new Date(side.endDate).getTime();
                    const now = new Date().getTime();
                    const diff = target - now;
                    setTimeLeft(diff > 0 ? diff : 0);
                }
            }
        } catch (err) {
            console.error("Banner fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Countdown Ticker
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => (prev <= 1000 ? 0 : prev - 1000));
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const formatTime = (ms: number) => {
        if (ms <= 0) return { h: 0, m: 0, s: 0 };
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((ms % (1000 * 60)) / 1000);
        return { h, m, s };
    };

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);

    const mainBanners = banners.filter(b => b.position === 'HOME_TOP' && b.isActive !== false);
    const sideBanner = banners.find(b => b.position === 'HOME_SIDE' && b.isActive !== false);

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
            <div className={`container ${styles.heroContent}`}>
                {/* 1. Main Premium Slider */}
                <div className={styles.sliderContainer}>
                    {(!isMounted || loading) ? (
                        <div className="animate-pulse bg-gray-100 w-full h-full"></div>
                    ) : (
                        <div className="w-full h-full relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={mainBanners.length > 0 ? mainBanners[currentIndex]?.id : 'default'}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className={styles.slider}
                                    style={{
                                        backgroundImage: mainBanners[currentIndex]?.image ? `url(${mainBanners[currentIndex].image})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <div className={styles.sliderOverlay}></div>
                                    <div className={styles.sliderContent}>
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2, duration: 0.6 }}
                                        >
                                            <h1 className={styles.sliderTitle}>
                                                {mainBanners[currentIndex]?.title || t('slider_title')}
                                            </h1>
                                        </motion.div>

                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4, duration: 0.6 }}
                                        >
                                            <Link
                                                href={mainBanners[currentIndex]?.link || '/products'}
                                                className={styles.sliderBtn}
                                            >
                                                {tCommon('batafsil')}
                                                <ChevronRight size={14} />
                                            </Link>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {mainBanners.length > 1 && (
                                <div className={styles.sliderDots}>
                                    {mainBanners.map((_, i) => (
                                        <button title="Tugma"
                                            key={i}
                                            onClick={() => setCurrentIndex(i)}
                                            className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 2. Special "Hot Deal" Card */}
                <div className={styles.hotDealCard}>
                    {(!isMounted || loading) ? (
                         <div className="animate-pulse bg-gray-100 w-full h-full rounded-2xl"></div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            <div className={styles.hotDealHeader}>
                                <div className={styles.hotDealBadge}>
                                    <Zap size={10} className="fill-current" />
                                    FLASH SALE
                                </div>
                                <div className={styles.countdown}>
                                    <div className={styles.timeBox}><span>{String(h).padStart(2, '0')}</span></div>
                                    <span className={styles.timeSep}>:</span>
                                    <div className={styles.timeBox}><span>{String(m).padStart(2, '0')}</span></div>
                                    <span className={styles.timeSep}>:</span>
                                    <div className={styles.timeBox}><span>{String(s).padStart(2, '0')}</span></div>
                                </div>
                            </div>

                            <Link 
                                href={sideBanner?.link || '/products'} 
                                className={styles.hotDealContent}
                            >
                                <div className={styles.hotDealImageWrapper}>
                                    {(sideBanner?.image && !imageError) ? (
                                        <motion.img 
                                            whileHover={{ scale: 1.1 }}
                                            src={sideBanner.image} 
                                            alt="Hot product" 
                                            className={styles.hotDealImage}
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                                            <TrendingUp size={24} className="text-blue-200" />
                                        </div>
                                    )}
                                    {sideBanner?.discount && <span className={styles.discountTag}>{sideBanner.discount}</span>}
                                </div>
                                
                                <div className={styles.hotDealInfo}>
                                    <h3 className={styles.hotDealTitle}>
                                        {sideBanner?.title || "Limited Edition"}
                                    </h3>
                                    <div className={styles.priceContainer}>
                                        <span className={styles.promoPrice}>
                                            {sideBanner?.price?.toLocaleString() || "0"} {tCommon('som')}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
