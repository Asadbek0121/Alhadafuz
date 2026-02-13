"use client";

import styles from './Hero.module.css';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Hero() {
    const t = useTranslations('Hero');
    const tCommon = useTranslations('Header');
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const trackImpression = useCallback((id: string) => {
        fetch(`/api/admin/banners/${id}/impression`, { method: 'POST' }).catch(() => { });
    }, []);

    const trackClick = useCallback((id: string) => {
        fetch(`/api/admin/banners/${id}/click`, { method: 'POST' }).catch(() => { });
    }, []);

    useEffect(() => {
        fetch('/api/banners')
            .then(res => res.json())
            .then(data => {
                setBanners(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const mainBanners = banners.filter(b => b.position === 'HOME_TOP' && b.isActive !== false);
    const sideBanner = banners.find(b => b.position === 'HOME_SIDE' && b.isActive !== false);

    // Track side banner impression once loaded
    useEffect(() => {
        if (sideBanner) {
            trackImpression(sideBanner.id);
        }
    }, [sideBanner, trackImpression]);

    // Track main banner impression when slide changes
    useEffect(() => {
        if (mainBanners.length > 0 && mainBanners[currentIndex]) {
            trackImpression(mainBanners[currentIndex].id);
        }
    }, [currentIndex, mainBanners, trackImpression]);

    // Auto-play logic
    useEffect(() => {
        if (mainBanners.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [mainBanners.length]);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);

    if (loading) return (
        <div className={styles.heroWrapper}>
            <div className={`container ${styles.heroContent}`}>
                <div style={{ height: '380px', width: '100%', background: '#f5f5f5', borderRadius: '20px', animation: 'heroPulse 2s infinite' }}></div>
                <div style={{ height: '380px', width: '100%', background: '#f5f5f5', borderRadius: '20px', animation: 'heroPulse 2s infinite' }}></div>
            </div>
        </div>
    );

    return (
        <div className={styles.heroWrapper}>
            <div className={`container ${styles.heroContent}`}>
                {/* Asosiy Banner (Slider) */}
                <div className={styles.sliderContainer}>
                    <AnimatePresence mode="wait">
                        {mainBanners.length > 0 ? (
                            <motion.div
                                key={mainBanners[currentIndex].id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className={styles.slider}
                                style={mainBanners[currentIndex].image ? { backgroundImage: `url(${mainBanners[currentIndex].image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                            >
                                <div className={styles.sliderContent}>
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className={styles.sliderTitle}
                                    >
                                        {mainBanners[currentIndex].title}
                                    </motion.div>
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className={styles.sliderDesc}
                                    >
                                        {mainBanners[currentIndex].description}
                                    </motion.div>
                                    <motion.a
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        href={mainBanners[currentIndex].link || '#'}
                                        onClick={() => trackClick(mainBanners[currentIndex].id)}
                                        className={styles.sliderBtn}
                                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'white' }}
                                    >
                                        {tCommon('batafsil')} <ChevronRight size={18} />
                                    </motion.a>
                                </div>
                            </motion.div>
                        ) : (
                            <div className={styles.slider}>
                                <div className={styles.sliderContent}>
                                    <div className={styles.sliderTitle}>{t('slider_title')}</div>
                                    <div className={styles.sliderDesc}>{t('slider_desc')}</div>
                                    <a href="#" className={styles.sliderBtn} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                                        {tCommon('batafsil')} <ChevronRight size={18} />
                                    </a>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Slider Navigation */}
                    {mainBanners.length > 1 && (
                        <div className={styles.sliderControls}>
                            <div className={styles.dots}>
                                {mainBanners.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`}
                                    />
                                ))}
                            </div>
                            <div className={styles.arrows}>
                                <button onClick={prevSlide} className={styles.arrowBtn}><ChevronLeft size={20} /></button>
                                <button onClick={nextSlide} className={styles.arrowBtn}><ChevronRight size={20} /></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Yon Banner (Promo Card) */}
                <div
                    className={styles.promoCard}
                    style={{ cursor: sideBanner?.link ? 'pointer' : 'default' }}
                    onClick={() => {
                        if (sideBanner?.link) {
                            trackClick(sideBanner.id);
                            window.open(sideBanner.link, '_self');
                        }
                    }}
                >
                    {(sideBanner?.discount || (!sideBanner && "-34%")) && (
                        <div className={styles.promoBadge}>{sideBanner?.discount || "-34%"}</div>
                    )}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '12px', margin: '16px 0', overflow: 'hidden' }}>
                        {sideBanner?.image ? (
                            <img src={sideBanner.image} alt={sideBanner.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ color: '#ccc' }}>Product Image</span>
                        )}
                    </div>
                    <div className={styles.promoTitle}>
                        {sideBanner?.title || "Simsiz naushniklar Redmi Buds 5 Pro Midnight Black"}
                    </div>
                    <div className={styles.promoPrice}>
                        <span className={styles.currentPrice}>
                            {sideBanner?.price ? `${sideBanner.price.toLocaleString()} ${tCommon('som')}` : (sideBanner && `549 000 ${tCommon('som')}`)}
                        </span>
                        {sideBanner?.oldPrice && (
                            <span className={styles.oldPrice}>{sideBanner.oldPrice.toLocaleString()} {tCommon('som')}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
