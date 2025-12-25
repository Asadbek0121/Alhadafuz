"use client";

import styles from './Footer.module.css';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Footer() {
    const t = useTranslations('Footer');
    const pathname = usePathname();
    const [socials, setSocials] = useState({
        telegram: 'https://t.me',
        instagram: 'https://instagram.com',
        facebook: 'https://facebook.com',
        youtube: 'https://youtube.com'
    });
    const [contact, setContact] = useState({
        phone: '+998 71 200 01 05',
        address: "Toshkent sh, Chilonzor tumani, Qatortol ko'chasi, 28",
        email: 'info@alhadaf.uz'
    });

    // Check if current page is Home
    const isHome = pathname === '/' || pathname === '/uz' || pathname === '/ru' || pathname === '/en';

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                if (data.socialLinks) {
                    try {
                        const parsed = JSON.parse(data.socialLinks);
                        setSocials(prev => ({ ...prev, ...parsed }));
                    } catch (e) { }
                }
                if (data.phone) setContact(prev => ({ ...prev, phone: data.phone }));
                if (data.address) setContact(prev => ({ ...prev, address: data.address }));
                if (data.email) setContact(prev => ({ ...prev, email: data.email }));
            })
            .catch(err => console.error("Footer settings error", err));
    }, []);

    return (
        <footer className={`${styles.footer} ${!isHome ? styles.mobileHidden : ''}`}>
            <div className={`container ${styles.mainFooter}`}>
                <div className={styles.columns}>
                    {/* Column 1: Information */}
                    <div className={styles.col}>
                        <h3>{t('info')}</h3>
                        <ul>
                            <li><Link href="/about">{t('about_us')}</Link></li>
                            <li><Link href="/terms">{t('public_offer')}</Link></li>
                            <li><Link href="/privacy">{t('privacy_policy')}</Link></li>
                            <li><Link href="/delivery">{t('fast_delivery')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 2: For Customers */}
                    <div className={styles.col}>
                        <h3>{t('for_customers')}</h3>
                        <ul>
                            <li><Link href="/profile">{t('order_status')}</Link></li>
                            <li><Link href="/faq">{t('faq')}</Link></li>
                            <li><Link href="/returns">{t('return_policy')}</Link></li>
                            <li><Link href="/stores">{t('our_stores')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Contact */}
                    <div className={styles.col}>
                        <h3>{t('contact')}</h3>
                        <div className={styles.contactItem}>
                            <Phone size={18} />
                            <span>{contact.phone}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <Mail size={18} />
                            <span>{contact.email}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <MapPin size={18} />
                            <span>{contact.address}</span>
                        </div>

                        <div className={styles.socials}>
                            <a href={socials.facebook} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="12" fill="#1877F2" />
                                    <path d="M14.656 24V14.658H17.391L17.756 11.488H14.656V9.45898C14.656 8.54898 14.908 7.92898 16.212 7.92898H17.876V5.10198C17.588 5.06398 16.599 4.97898 15.449 4.97898C13.048 4.97898 11.404 6.44398 11.404 9.14198V11.488H8.70605V14.658H11.404V24H14.656Z" fill="white" />
                                </svg>
                            </a>
                            <a href={socials.instagram} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C8.741 0 8.333 0.014 7.053 0.072C5.775 0.132 4.902 0.333 4.14 0.629C3.35 0.936 2.68 1.352 2.011 2.021C1.342 2.69 0.926 3.36 0.619 4.15C0.323 4.912 0.122 5.785 0.062 7.063C0.004 8.343 0 8.751 0 12.01C0 15.269 0.004 15.677 0.062 16.957C0.122 18.235 0.323 19.108 0.619 19.87C0.926 20.66 1.342 21.33 2.011 21.999C2.68 22.668 3.35 23.084 4.14 23.391C4.902 23.687 5.775 23.888 7.053 23.948C8.333 24.006 8.741 24.02 12 24.02C15.259 24.02 15.667 24.006 16.947 23.948C18.225 23.888 19.098 23.687 19.86 23.391C20.65 23.084 21.32 22.668 21.989 21.999C22.658 21.33 23.074 20.66 23.381 19.87C23.677 19.108 23.878 18.235 23.938 16.957C23.996 15.677 24.01 15.269 24.01 12.01C24.01 8.751 23.996 8.343 23.938 7.063C23.878 5.785 23.677 4.912 23.381 4.15C23.074 3.36 22.658 2.69 21.989 2.021C21.32 1.352 20.65 0.936 19.86 0.629C19.098 0.333 18.225 0.132 16.947 0.072C15.667 0.014 15.259 0 12 0ZM12 2.162C15.203 2.162 15.584 2.175 16.85 2.232C18.02 2.285 18.656 2.481 19.078 2.645C19.637 2.862 20.035 3.123 20.453 3.541C20.871 3.959 21.132 4.357 21.349 4.916C21.513 5.338 21.709 5.975 21.762 7.144C21.82 8.41 21.832 8.791 21.832 11.994C21.832 15.197 21.82 15.578 21.762 16.844C21.709 18.013 21.513 18.65 21.349 19.072C21.132 19.631 20.871 20.029 20.453 20.447C20.035 20.865 19.637 21.126 19.078 21.343C18.656 21.507 18.02 21.703 16.85 21.756C15.584 21.814 15.203 21.826 12 21.826C8.797 21.826 8.416 21.814 7.15 21.756C5.98 21.703 5.344 21.507 4.922 21.343C4.363 21.126 3.965 20.865 3.547 20.447C3.129 20.029 2.868 19.631 2.651 19.072C2.487 18.65 2.291 18.013 2.238 16.844C2.18 15.578 2.168 15.197 2.168 11.994C2.168 8.791 2.18 8.41 2.238 7.144C2.291 5.975 2.487 5.338 2.651 4.916C2.868 4.357 3.129 3.959 3.547 3.541C3.965 3.123 4.363 2.862 4.922 2.645C5.344 2.481 5.98 2.285 7.15 2.232C8.416 2.175 8.797 2.162 12 2.162ZM12 5.838C8.598 5.838 5.842 8.594 5.842 11.996C5.842 15.398 8.598 18.154 12 18.154C15.402 18.154 18.158 15.398 18.158 11.996C18.158 8.594 15.402 5.838 12 5.838ZM12 15.996C9.791 15.996 8 14.205 8 11.996C8 9.787 9.791 7.996 12 7.996C14.209 7.996 16 9.787 16 11.996C16 14.205 14.209 15.996 12 15.996ZM19.839 5.602C19.839 6.398 19.193 7.043 18.398 7.043C17.602 7.043 16.957 6.398 16.957 5.602C16.957 4.806 17.602 4.161 18.398 4.161C19.193 4.161 19.839 4.806 19.839 5.602Z" fill="url(#paint0_linear)" />
                                    <defs>
                                        <linearGradient id="paint0_linear" x1="2.011" y1="21.999" x2="21.989" y2="2.021" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#FEDA75" />
                                            <stop offset="0.25" stopColor="#FA7E1E" />
                                            <stop offset="0.5" stopColor="#D62976" />
                                            <stop offset="0.75" stopColor="#962FBF" />
                                            <stop offset="1" stopColor="#4F5BD5" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </a>
                            <a href={socials.telegram} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="#229ED9" />
                                    <path fillRule="evenodd" clipRule="evenodd" d="M5.42986 11.9022C9.07886 10.3129 11.5119 9.25997 12.7291 8.75389C16.2049 7.3088 16.9272 7.05786 17.398 7.04944C17.5015 7.04759 17.7329 7.0731 17.8829 7.19478C18.0095 7.29745 18.0444 7.43627 18.061 7.53359C18.0777 7.6309 18.0987 7.85253 18.082 8.02787C17.892 10.0278 17.0701 14.8698 16.6521 17.1054C16.4751 18.0516 16.1265 18.3686 15.789 18.3996C15.0561 18.467 14.4996 17.9152 13.7895 17.4498C12.6781 16.7214 12.0504 16.2678 10.9717 15.557C9.72536 14.7363 10.5334 14.285 11.2435 13.5473C11.4293 13.3542 14.6576 10.4173 14.7201 10.1508C14.7279 10.1174 14.7351 9.99285 14.6611 9.92705C14.587 9.86126 14.4777 9.88373 14.3988 9.90163C14.2869 9.92705 12.5056 11.1042 9.05602 13.4338C8.55056 13.7809 8.09282 13.9499 7.68266 13.9411C7.23041 13.9313 6.36018 13.6853 5.71343 13.475C4.92003 13.217 4.28929 13.0807 4.34407 12.6436C4.3726 12.4159 4.68625 12.1831 5.30418 11.9392L5.42986 11.9022Z" fill="white" />
                                </svg>
                            </a>
                            <a href={socials.youtube} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M23.498 6.186C23.226 5.168 22.4281 4.3701 21.4101 4.0981C19.5301 3.6 12.0001 3.6 12.0001 3.6C12.0001 3.6 4.4701 3.6 2.5901 4.0981C1.5721 4.3701 0.774095 5.168 0.502095 6.186C0.000104845 8.06605 -5.20197e-07 12 0 12C-5.20197e-07 12 0.000104845 15.934 0.502095 17.814C0.774095 18.832 1.5721 19.63 2.5901 19.902C4.4701 20.4 12.0001 20.4 12.0001 20.4C12.0001 20.4 19.5301 20.4 21.4101 19.902C22.4281 19.63 23.226 18.832 23.498 17.814C24.0101 15.934 24.0001 12 24.0001 12C24.0001 12 24.0101 8.06605 23.498 6.186Z" fill="#F00" />
                                    <path d="M9.54504 15.568V8.43201L15.818 12L9.54504 15.568Z" fill="white" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Column 4: App Download */}
                    <div className={styles.col}>
                        <h3>{t('download_app')}</h3>
                        <div className={styles.appLinks}>
                            <a href="#" className={styles.storeLink}>
                                <img src="https://asaxiy.uz/custom-assets/images/app-store.svg" alt="App Store" />
                            </a>
                            <a href="#" className={styles.storeLink}>
                                <img src="https://asaxiy.uz/custom-assets/images/google-play.svg" alt="Google Play" />
                            </a>
                        </div>
                        <p className={styles.copy}>
                            &copy; {new Date().getFullYear()} HADAF. {t('all_rights_reserved')}.
                        </p>
                    </div>
                </div>

                <div className={styles.paymentSection}>
                    <h2 className={styles.paymentTitle}>To'lov turlari</h2>
                    <div className={styles.paymentGrid}>
                        {/* Payme */}
                        <div className={styles.paymentCard}>
                            <img src="https://asaxiy.uz/custom-assets/images/payme.svg" alt="Payme" />
                        </div>

                        {/* Uzcard + Humo */}
                        <div className={styles.paymentCard}>
                            <div className={styles.dualCard}>
                                <img src="https://asaxiy.uz/custom-assets/images/uzcard.svg" alt="Uzcard" style={{ height: '22px' }} />
                                <img src="https://asaxiy.uz/custom-assets/images/humo.svg" alt="Humo" style={{ height: '22px' }} />
                            </div>
                        </div>

                        {/* Click */}
                        <div className={styles.paymentCard}>
                            <div className={styles.customLogo} style={{ color: '#000', gap: '6px' }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="5" y="5" width="14" height="14" rx="4" transform="rotate(45 12 12)" fill="#0073FF" />
                                    <circle cx="12" cy="12" r="3" fill="white" />
                                </svg>
                                <span style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px' }}>click</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

