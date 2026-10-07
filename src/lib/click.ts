
import crypto from "crypto";

export const generateClickUrl = (
    serviceId: string,
    merchantId: string,
    merchantTransId: string,
    amount: number
) => {
    const baseUrl = "https://my.click.uz/services/pay";
    const params = new URLSearchParams();
    params.append("service_id", serviceId);
    params.append("merchant_id", merchantId);
    params.append("amount", amount.toFixed(2));
    params.append("transaction_param", merchantTransId);
    return `${baseUrl}?${params.toString()}`;
};

/** Test muhit: Click sandbox */
export const CLICK_TEST_PAY_BASE_URL = "https://test.my.click.uz/services/pay";

/** Production baseUrl — CLICK_TEST_MODE=true bo'lsa test URL ishlatiladi */
export function getClickPayBaseUrl(): string {
    return (process.env.CLICK_TEST_MODE === "true")
        ? CLICK_TEST_PAY_BASE_URL
        : "https://my.click.uz/services/pay";
}

/** Bazadagi (admin panel) CLICK PaymentMethod.config + env fallback. */
export type ClickConfig = {
    serviceId: string;
    merchantId: string;
    secretKey: string;
    source: "DB" | "ENV";
};

/**
 * Click konfiguratsiyasini oladi: avval admin panelda saqlangan
 * PaymentMethod (provider=CLICK, isActive) config JSON'dan, bo'lmasa env'dan.
 * Secret key hech qachon qaytarilmaydi — faqat serverda ishlatiladi.
 */export const getClickConfig = async (): Promise<ClickConfig | null> => {
    // 1) DB (admin panelda sozlangan)
    try {
        const { prisma } = await import("@/lib/prisma");
        const method = await prisma.paymentMethod.findFirst({
            where: { provider: "CLICK", isActive: true },
            orderBy: { createdAt: "desc" },
        });
        if (method?.config) {
            const cfg = JSON.parse(method.config);
            // secret_key (tavsiya) yoki secretKey varianti qabul qilinadi
            const secret = cfg?.secret_key ?? cfg?.secretKey;
            if (cfg?.service_id && secret) {
                return {
                    serviceId: String(cfg.service_id),
                    merchantId: String(cfg.merchant_id ?? ""),
                    secretKey: String(secret),
                    source: "DB",
                };
            }
            console.warn("[click] DB config to'liq emas — secret_key yo'q. Admin panel > To'lov Tizimlari'da JSON'ga secret_key qo'shing.");
        }
    } catch (e) {
        console.warn("[click] DB config o'qishda xato, env fallback:", e);
    }

    // 2) Env fallback
    const envServiceId = process.env.CLICK_SERVICE_ID;
    const envSecretKey = process.env.CLICK_SECRET_KEY;
    const envMerchantId = process.env.CLICK_MERCHANT_ID;
    if (envServiceId && envSecretKey) {
        return {
            serviceId: envServiceId,
            merchantId: envMerchantId || "",
            secretKey: envSecretKey,
            source: "ENV",
        };
    }

    return null;
};

/** Buyurtma uchun Click to'lov sahifasi URL'i (rasmiy my.click.uz formati).
 *  transaction_param sifatida readable orderNumber (#1000xxx) ishlatiladi;
 *  webhook'da aynan shu qiymat orderNumber orqali topiladi. */
export const buildClickPayUrl = (
    config: ClickConfig,
    orderNumber: string,
    amount: number
): string => {
    const params = new URLSearchParams();
    params.append("service_id", config.serviceId);
    if (config.merchantId) params.append("merchant_id", config.merchantId);
    params.append("amount", amount.toFixed(2));
    params.append("transaction_param", orderNumber);
    return `${getClickPayBaseUrl()}?${params.toString()}`;
};

/**
 * Verifies the Click Pay MD5 signature.
 * specific logic: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + (merchant_prepare_id if action=1) + amount + action + sign_time)
 */
export const verifyClickSignature = (
    clickTransId: string,
    serviceId: string,
    secretKey: string,
    merchantTransId: string,
    merchantPrepareId: string | null,
    amount: string, // Click sends amount as string
    action: number,
    signTime: string
): string => {
    const prepareId = action === 1 && merchantPrepareId ? merchantPrepareId : "";
    const str = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${prepareId}${amount}${action}${signTime}`;
    return crypto.createHash("md5").update(str).digest("hex");
};
