"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/navigation";
import { useSearchParams } from "next/navigation";

/**
 * Til almashtirish — dropdown/popup YO'Q.
 *
 * Tugma doim KEYINGI (navbatdagi) tilni ko'rsatadi va bosilganda darhol
 * o'tadi: UZ → RU → EN → UZ. Joriy sahifa route'i va query parametrlari
 * saqlanadi (masalan /uz/product/123 → /ru/product/123).
 */
export default function LanguageSwitcher({ minimal = false }: { minimal?: boolean }) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('Header');

    const languages = [
        { code: "uz", label: "O'zbek", short: "UZ", img: "/assets/flags/uz.png" },
        { code: "ru", label: "Русский", short: "RU", img: "/assets/flags/ru.png" },
        { code: "en", label: "English", short: "EN", img: "/assets/flags/en.png" },
    ];

    // Cycle: uz → ru → en → uz. Joriy locale'ning KEYINGISI ko'rsatiladi.
    const currentIdx = Math.max(0, languages.findIndex(l => l.code === locale));
    const nextLang = languages[(currentIdx + 1) % languages.length];

    const handleSwitch = () => {
        // Query parametrlarni saqlash (next-intl usePathname query'ni bermaydi)
        const query = searchParams.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { locale: nextLang.code });
    };

    return (
        <button
            type="button"
            onClick={handleSwitch}
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
            aria-label={`${t('language_switcher')}: ${nextLang.label}`}
            title={`${t('language_switcher')}: ${nextLang.label}`}
        >
            {minimal ? (
                <div style={{ width: '28px', height: '28px', position: 'relative' }}>
                    <img
                        src={nextLang.img}
                        alt={nextLang.label}
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
                    src={nextLang.img}
                    alt={nextLang.label}
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
                    {nextLang.short}
                </span>
            )}
        </button>
    );
}
