"use client";

import { Phone, Mail, MapPin, Facebook, Instagram, Send, Youtube } from 'lucide-react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Montserrat } from "next/font/google";
import InstallAppButtons from '../InstallAppButtons';
import VendorApplicationModal from '../VendorApplicationModal';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const montserrat = Montserrat({ weight: ["700", "900"], subsets: ["latin"] });

export default function Footer() {
    const t = useTranslations('Footer');
    const pathname = usePathname();
    const isCheckout = pathname === '/checkout' || pathname?.includes('/checkout');

    const [socials, setSocials] = useState({
        telegram: 'https://t.me',
        instagram: 'https://instagram.com',
        facebook: 'https://facebook.com',
        youtube: 'https://youtube.com'
    });
    const [contact, setContact] = useState({
        phone: '+998 71 200 01 05',
        address: "Termiz sh, At-Termiziy ko'chasi",
        email: 'info@hadaf.uz'
    });
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const tAbout = useTranslations('About');

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

    if (isCheckout) return null;

    return (
        <footer className={`bg-[#111827] text-gray-300 border-t border-gray-800 ${!isHome ? 'hidden lg:block' : ''}`}>
            {/* Partnership Section - Moved from About Page */}
            <div className="container mx-auto px-4 pt-12">
                <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-950 rounded-3xl p-6 md:p-10 text-center md:text-left text-white relative overflow-hidden shadow-2xl group border border-blue-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1">
                            <h2 className="text-xl md:text-3xl font-black mb-3 leading-tight tracking-tight">
                                {tAbout('cta_title')}
                            </h2>
                            <p className="text-blue-100/70 max-w-xl text-sm md:text-base font-medium">
                                {tAbout('cta_desc')}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsVendorModalOpen(true)}
                            className="whitespace-nowrap bg-white text-blue-900 px-6 py-3 md:px-10 md:py-4 rounded-2xl font-black uppercase text-xs md:text-sm tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 group/btn"
                        >
                            {tAbout('cta_btn')}
                            <ArrowRight size={20} className="transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">

                    {/* Brand & Socials (Col 1 - spans 4 on LG) */}
                    <div className="lg:col-span-4 space-y-6">
                        <Link href="/" className="flex items-center group w-fit -ml-4">
                            <img src="/logo.png" alt="Hadaf Logo" className="h-16 w-auto object-contain transition-transform group-hover:scale-105" />
                            <div className="flex flex-col">
                                <span className={`${montserrat.className} text-3xl font-black tracking-tighter text-blue-500 leading-none uppercase`}>Hadaf</span>
                                <span className="text-[8px] font-bold tracking-[0.2em] text-blue-500/80 uppercase mt-[-2px] ml-0.5">Market</span>
                            </div>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                            {t('download_app_desc')}
                        </p>
                        <div className="flex gap-4">
                            <SocialLink href={socials.facebook} icon={<Facebook size={20} />} color="hover:text-blue-500" />
                            <SocialLink href={socials.instagram} icon={<Instagram size={20} />} color="hover:text-pink-500" />
                            <SocialLink href={socials.telegram} icon={<Send size={20} />} color="hover:text-blue-400" />
                            <SocialLink href={socials.youtube} icon={<Youtube size={20} />} color="hover:text-red-500" />
                        </div>
                    </div>

                    {/* Links Column 1 & 2 (Combined for Mobile 2-col layout) */}
                    <div className="lg:col-span-4 grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-white font-bold text-lg mb-6">{t('info')}</h3>
                            <ul className="space-y-3 text-sm">
                                <FooterLink href="/about">{t('about_us')}</FooterLink>
                                <FooterLink href="/terms">{t('public_offer')}</FooterLink>
                                <FooterLink href="/privacy">{t('privacy_policy')}</FooterLink>
                                <FooterLink href="/delivery">{t('fast_delivery')}</FooterLink>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-white font-bold text-lg mb-6">{t('for_customers')}</h3>
                            <ul className="space-y-3 text-sm">
                                <FooterLink href="/profile">{t('order_status')}</FooterLink>
                                <FooterLink href="/faq">{t('faq')}</FooterLink>
                                <FooterLink href="/returns">{t('return_policy')}</FooterLink>
                                <FooterLink href="/stores">{t('our_stores')}</FooterLink>
                            </ul>
                        </div>
                    </div>

                    {/* Contact & App (Col 4 - spans 4 on LG) */}
                    <div className="lg:col-span-4 space-y-8">
                        <div>
                            <h3 className="text-white font-bold text-lg mb-6">{t('contact')}</h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-4">
                                    <Phone className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                    <div>
                                        <span className="block text-xs text-gray-500 mb-0.5">{t('call_center')}</span>
                                        <a href={`tel:${contact.phone}`} className="text-white font-medium hover:text-blue-400 transition-colors text-lg block">
                                            {contact.phone}
                                        </a>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <Mail className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                    <div>
                                        <span className="block text-xs text-gray-500 mb-0.5">{t('email_label')}</span>
                                        <a href={`mailto:${contact.email}`} className="text-gray-300 hover:text-white transition-colors text-sm block">
                                            {contact.email}
                                        </a>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <MapPin className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                    <div>
                                        <span className="block text-xs text-gray-500 mb-0.5">{t('address_label')}</span>
                                        <span className="text-gray-300 text-sm block">
                                            {contact.address}
                                        </span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-white font-bold text-lg mb-4">{t('download_app')}</h3>
                            <InstallAppButtons />
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-gray-500 text-center md:text-left">
                        &copy; {new Date().getFullYear()} {t('brand_name')}. {t('all_rights_reserved')}.
                    </p>

                    <div className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                        <PaymentIcon src="/click_logo_final.png" alt="Click" />
                        <PaymentIcon src="https://asaxiy.uz/custom-assets/images/payme.svg" alt="Payme" />
                        <PaymentIcon src="https://asaxiy.uz/custom-assets/images/uzcard.svg" alt="Uzcard" />
                        <PaymentIcon src="https://asaxiy.uz/custom-assets/images/humo.svg" alt="Humo" />
                    </div>
                </div>
            </div>

            <VendorApplicationModal
                isOpen={isVendorModalOpen}
                onClose={() => setIsVendorModalOpen(false)}
            />
        </footer>
    );
}

function SocialLink({ href, icon, color }: { href: string, icon: React.ReactNode, color: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 transition-all transform hover:scale-110 hover:bg-white ${color}`}
        >
            {icon}
        </a>
    );
}

function FooterLink({ href, children }: { href: string, children: React.ReactNode }) {
    return (
        <li>
            <Link
                href={href}
                className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 inline-block duration-200"
            >
                {children}
            </Link>
        </li>
    );
}

function PaymentIcon({ src, alt }: { src: string, alt: string }) {
    return (
        <div className="bg-white px-2 py-1 rounded h-8 w-14 flex items-center justify-center overflow-hidden">
            <img src={src} alt={alt} className="h-full w-auto object-contain" />
        </div>
    );
}
