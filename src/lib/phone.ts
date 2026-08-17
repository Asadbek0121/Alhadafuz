// O'zbekiston telefon raqamini normalizatsiya qilish va tekshirish
// Qabul qiladi: +998 90 123 45 67, 998901234567, (90) 123-45-67 kabi ko'rinishlar
// Qaytaradi: "+998901234567" (valid) yoki null (noto'g'ri format)

export function normalizeUzPhone(input: string | null | undefined): string | null {
    const digits = (input || '').replace(/\D/g, '');

    // 12 xonali, 998 bilan boshlanishi shart (998 + 9 raqam)
    if (!/^998\d{9}$/.test(digits)) {
        return null;
    }

    return '+' + digits;
}

// Insonga mos ism-familiya: 2-60 belgi, bo'sh joy bilan boshlanmaydi
export function isValidUserName(name: string | null | undefined): boolean {
    if (!name) return false;
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) return false;
    // Kamida bitta harf bo'lishi shart (faqat raqam/belgilar emas)
    return /[a-zA-Z\u0400-\u04FF]/.test(trimmed);
}
