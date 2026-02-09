"use client";

import styles from './Hero.module.css';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

export default function Hero() {
    const t = useTranslations('Hero');
    const tCommon = useTranslations('Header');
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/banners')
            .then(res => res.json())
            .then(data => {
                setBanners(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const mainBanner = banners.find(b => b.type === 'MAIN' && b.isActive !== false);
    const sideBanner = banners.find(b => b.type === 'SIDE' && b.isActive !== false);

    if (loading) return <div className={styles.heroWrapper}><div className="container" style={{ height: '400px', background: '#f0f0f0', borderRadius: '20px' }}></div></div>;

    return (
        <div className={styles.heroWrapper}>
            <div className={`container ${styles.heroContent}`}>
                {/* Asosiy Banner (Slider) */}
                <div
                    className={styles.slider}
                    style={mainBanner?.imageUrl ? { backgroundImage: `url(${mainBanner.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                    <div className={styles.sliderContent}>
                        <div className={styles.sliderTitle}>
                            {mainBanner ? mainBanner.title : t('slider_title')}
                        </div>
                        <div className={styles.sliderDesc}>
                            {mainBanner ? mainBanner.description : t('slider_desc')}
                        </div>
                        <a href={mainBanner?.link || '#'} className={styles.sliderBtn} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                            {tCommon('batafsil')} <ChevronRight size={18} />
                        </a>
                    </div>
                </div>

                {/* Yon Banner (Promo Card) */}
                <div className={styles.promoCard} style={{ cursor: sideBanner?.link ? 'pointer' : 'default' }} onClick={() => sideBanner?.link && window.open(sideBanner.link, '_self')}>
                    {(sideBanner?.discount || (!sideBanner && "-34%")) && (
                        <div className={styles.promoBadge}>{sideBanner?.discount || "-34%"}</div>
                    )}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: '12px', margin: '16px 0', overflow: 'hidden' }}>
                        {sideBanner?.imageUrl ? (
                            <img src={sideBanner.imageUrl} alt={sideBanner.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ color: '#ccc' }}>Product Image</span>
                        )}
                    </div>
                    <div className={styles.promoTitle}>
                        {sideBanner?.title || "Simsiz naushniklar Redmi Buds 5 Pro Midnight Black"}
                    </div>
                    <div className={styles.promoPrice}>
                        <span className={styles.currentPrice}>
                            {sideBanner?.price ? `${sideBanner.price.toLocaleString()} ${tCommon('som')}` : (sideBanner?.description || `549 000 ${tCommon('som')}`)}
                        </span>
                        {sideBanner?.oldPrice ? (
                            <span className={styles.oldPrice}>{sideBanner.oldPrice.toLocaleString()} {tCommon('som')}</span>
                        ) : (!sideBanner && <span className={styles.oldPrice}>819 000 {tCommon('som')}</span>)}
                    </div>
                </div>
            </div>
        </div>
    );
}
