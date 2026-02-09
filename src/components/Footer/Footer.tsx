"use client";

import { Phone, Mail, MapPin, Facebook, Instagram, Send, Youtube, Smartphone } from 'lucide-react';
import { Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: ["700", "900"], subsets: ["latin"] });

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
        address: "Termiz sh, At-Termiziy ko'chasi",
        email: 'info@hadaf.uz'
    });

    // Check if current page is Home to potentially toggle visibility (if needed, but kept visible for now)
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
        <footer className={`bg-slate-900 dark:bg-[#111111] text-slate-300 border-t border-slate-800 dark:border-white/10 ${!isHome ? 'hidden lg:block' : ''}`}>
            {/* Main Footer Content */}
            <div className="container pt-8 pb-32 md:pt-10 md:pb-16">
                <div className="mb-6 -ml-6">
                    <Link href="/" className="flex items-center gap-0 group">
                        <img src="/logo.png" alt="Hadaf Logo" className="h-[150px] w-auto group-hover:scale-105 transition-transform" />
                        <span className={`${montserrat.className} text-5xl md:text-6xl font-black tracking-tighter text-[#0052FF] -ml-6 pt-2`}>Hadaf</span>
                    </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">

                    {/* Column 1: Info */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">{t('info')}</h3>
                        <ul className="space-y-4">
                            <li><Link href="/about" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('about_us')}</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('public_offer')}</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('privacy_policy')}</Link></li>
                            <li><Link href="/delivery" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('fast_delivery')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 2: Customers */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">{t('for_customers')}</h3>
                        <ul className="space-y-4">
                            <li><Link href="/profile" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('order_status')}</Link></li>
                            <li><Link href="/faq" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('faq')}</Link></li>
                            <li><Link href="/returns" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('return_policy')}</Link></li>
                            <li><Link href="/stores" className="hover:text-white transition-colors hover:translate-x-1 inline-block duration-200">{t('our_stores')}</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Contact */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">{t('contact')}</h3>
                        <ul className="space-y-5">
                            <li className="flex items-start gap-4">
                                <Phone className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                <div>
                                    <span className="block text-xs text-slate-500 mb-1">Aloqa markazi</span>
                                    <span className="text-white font-medium hover:text-blue-400 cursor-pointer transition-colors block text-lg">{contact.phone}</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <Mail className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                <div>
                                    <span className="block text-xs text-slate-500 mb-1">Elektron pochta</span>
                                    <span className="hover:text-white transition-colors cursor-pointer">{contact.email}</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <MapPin className="w-5 h-5 text-blue-500 mt-1 shrink-0" />
                                <div>
                                    <span className="block text-xs text-slate-500 mb-1">Manzil</span>
                                    <span className="hover:text-white transition-colors">{contact.address}</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: App & Socials */}
                    <div>
                        <h3 className="text-white font-bold text-lg mb-6">{t('download_app')}</h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            HADAF ilovasini yuklab oling va xaridlarni yanada qulayroq amalga oshiring.
                        </p>
                        <div className="flex flex-col gap-3 mb-8">
                            <a href="#" className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-all group border border-slate-700 hover:border-slate-600">
                                <img src="https://asaxiy.uz/custom-assets/images/app-store.svg" alt="App Store" className="h-6 opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 leading-none">Download on the</span>
                                    <span className="text-sm font-bold text-white leading-none mt-1">App Store</span>
                                </div>
                            </a>
                            <a href="#" className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl transition-all group border border-slate-700 hover:border-slate-600">
                                <img src="https://asaxiy.uz/custom-assets/images/google-play.svg" alt="Google Play" className="h-6 opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 leading-none">GET IT ON</span>
                                    <span className="text-sm font-bold text-white leading-none mt-1">Google Play</span>
                                </div>
                            </a>
                        </div>

                        <div className="flex gap-4">
                            <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#1877F2] hover:text-white transition-all transform hover:scale-110">
                                <Facebook size={20} />
                            </a>
                            <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-gradient-to-tr hover:from-orange-500 hover:via-pink-500 hover:to-purple-500 hover:text-white transition-all transform hover:scale-110">
                                <Instagram size={20} />
                            </a>
                            <a href={socials.telegram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#229ED9] hover:text-white transition-all transform hover:scale-110">
                                <Send size={20} />
                            </a>
                            <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-[#F00] hover:text-white transition-all transform hover:scale-110">
                                <Youtube size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Payment & Copy */}
                <div className="border-t border-slate-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-slate-500">
                        &copy; {new Date().getFullYear()} HADAF Marketpleysi. {t('all_rights_reserved')}.
                    </p>

                    <div className="flex items-center gap-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                        <div className="bg-white px-6 py-1 rounded overflow-hidden flex items-center justify-center">
                            <img src="/click_logo_final.png" alt="Click" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="bg-white px-2 py-1 rounded">
                            <img src="https://asaxiy.uz/custom-assets/images/payme.svg" alt="Payme" className="h-6" />
                        </div>
                        <div className="bg-white px-2 py-1 rounded">
                            <img src="https://asaxiy.uz/custom-assets/images/uzcard.svg" alt="Uzcard" className="h-6" />
                        </div>
                        <div className="bg-white px-2 py-1 rounded">
                            <img src="https://asaxiy.uz/custom-assets/images/humo.svg" alt="Humo" className="h-6" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
