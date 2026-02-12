"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, Languages } from "lucide-react";

export default function LanguageSwitcher({ minimal = false }: { minimal?: boolean }) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const languages = [
        { code: "uz", label: "O'zbek", short: "UZ", flag: "🇺🇿", img: "/assets/flags/uz.png" },
        { code: "ru", label: "Русский", short: "RU", flag: "🇷🇺", img: "/assets/flags/ru.png" },
        { code: "en", label: "English", short: "EN", flag: "🇺🇸", img: "/assets/flags/en.png" },
    ];

    const activeLang = languages.find(l => l.code === locale) || languages[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSwitch = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={ref} style={{ zIndex: 50 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: minimal ? '0' : '8px',
                    padding: minimal ? '0' : '8px 12px',
                    width: minimal ? '34px' : 'auto',
                    height: minimal ? '34px' : 'auto',
                    borderRadius: minimal ? '50%' : '9999px',
                    background: minimal ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: minimal ? 'none' : 'blur(12px)',
                    border: minimal ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
                    fontSize: '14px',
                    fontWeight: minimal ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'inherit',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: minimal ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                }}
                className={minimal ? "active:scale-95" : "hover:bg-black/5 active:scale-95"}
            >
                {minimal ? (
                    <img
                        src={activeLang.img}
                        alt={activeLang.label}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            display: 'block'
                        }}
                    />
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        style={{
                            position: 'absolute',
                            right: 0,
                            marginTop: '8px',
                            width: '180px',
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(0,0,0,0.05)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            borderRadius: '16px',
                            padding: '4px',
                            overflow: 'hidden'
                        }}
                    >
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleSwitch(lang.code)}
                                style={{
                                    display: 'flex',
                                    width: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    background: locale === lang.code ? 'rgba(0,0,0,0.05)' : 'transparent',
                                    border: 'none',
                                    fontWeight: locale === lang.code ? 600 : 400,
                                    marginBottom: '2px'
                                }}
                                className="hover:bg-black/5"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img
                                        src={lang.img}
                                        alt={lang.code}
                                        style={{ width: '20px', height: '20px', objectFit: 'cover', borderRadius: '50%' }}
                                    />
                                    <span>{lang.label}</span>
                                </div>
                                {locale === lang.code && <Check size={14} color="#10b981" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
