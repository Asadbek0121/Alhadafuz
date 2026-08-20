"use client";

import { useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import { Check } from "lucide-react";

export default function LanguageSwitcher({ minimal = false }: { minimal?: boolean }) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('Header');
    const { activeMenu, toggleMenu, closeAllMenus } = useUIStore();
    const isOpen = activeMenu === 'language';
    const ref = useRef<HTMLDivElement>(null);

    const languages = [
        { code: "uz", label: "O'zbek", short: "UZ", img: "/assets/flags/uz.png" },
        { code: "ru", label: "Русский", short: "RU", img: "/assets/flags/ru.png" },
        { code: "en", label: "English", short: "EN", img: "/assets/flags/en.png" },
    ];

    const activeLang = languages.find(l => l.code === locale) || languages[0];

    // Tashqariga bosilganda yopiladi
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                closeAllMenus();
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [closeAllMenus]);

    const handleSwitch = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        closeAllMenus();
    };

    return (
        <div className="relative" ref={ref} style={{ zIndex: 100 }}>
            <button
                type="button"
                onClick={() => toggleMenu('language')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: minimal ? '0' : '8px',
                    padding: minimal ? '0' : '8px 12px',
                    width: minimal ? '40px' : 'auto',
                    height: minimal ? '40px' : 'auto',
                    borderRadius: minimal ? '12px' : '9999px',
                    background: minimal ? 'white' : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: minimal ? 'none' : 'blur(12px)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    fontWeight: minimal ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: 'inherit',
                    position: 'relative',
                    boxShadow: minimal ? '0 4px 15px rgba(0,0,0,0.08)' : 'none'
                }}
                className={minimal ? "active:scale-90 hover:shadow-md" : "hover:bg-black/5 active:scale-95"}
                aria-label={`${t('language_switcher')}: ${activeLang.label}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls="language-menu"
            >
                {minimal ? (
                    <div style={{ width: '28px', height: '28px', position: 'relative' }}>
                        <img
                            src={activeLang.img}
                            alt={activeLang.label}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                display: 'block',
                                border: '1px solid rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                ) : (
                    <img
                        src={activeLang.img}
                        alt={activeLang.label}
                        style={{
                            width: '20px',
                            height: '20px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            display: 'block'
                        }}
                    />
                )}

                {!minimal && (
                    <span style={{ textTransform: 'uppercase' }}>
                        {locale}
                    </span>
                )}
            </button>

            {/* Dropdown — barcha ekran o'lchamlarida (mobil aylanish o'rniga) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="language-menu"
                        role="menu"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 'calc(100% + 12px)',
                            width: '200px',
                            background: 'white',
                            border: '1px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                            borderRadius: '24px',
                            padding: '8px',
                            overflow: 'hidden',
                            zIndex: 101,
                        }}
                    >
                        <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                            {t('language_switcher')}
                        </div>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                role="menuitemradio"
                                aria-checked={locale === lang.code}
                                onClick={() => handleSwitch(lang.code)}
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    background: locale === lang.code ? '#F2F6FF' : 'transparent',
                                    color: locale === lang.code ? '#2563eb' : '#1e293b',
                                    border: 'none',
                                    fontWeight: locale === lang.code ? 700 : 500,
                                    marginBottom: '4px',
                                    transition: 'all 0.2s ease'
                                }}
                                className="hover:bg-slate-50 group"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img
                                        src={lang.img}
                                        alt={lang.code}
                                        style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.05)' }}
                                    />
                                    <span>{lang.label}</span>
                                </div>
                                {locale === lang.code && (
                                    <div style={{ background: '#2563eb', color: 'white', padding: '3px', borderRadius: '50%' }}>
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
