/**
 * Payme Merchant API integratsiyasi
 * Rasmiy hujjatlar: https://developer.help.paycom.uz/
 */

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type PaymeConfig = {
    /** Web-cassa ID (merchant_id) */
    merchant: string;
    /** LK login */
    login: string;
    /** Asosiy kalit */
    key: string;
    /** Test kalit (sandbox) */
    testKey?: string;
};

export type PaymeMode = "production" | "test";

/** Payme konfiguratsiyasini oladi */
export async function getPaymeConfig(mode: PaymeMode = "production"): Promise<PaymeConfig | null> {
    // 1) DB dan olish
    try {
        const { prisma } = await import("@/lib/prisma");
        const method = await prisma.paymentMethod.findFirst({
            where: { provider: "PAYME", isActive: true },
            orderBy: { createdAt: "desc" },
        });
        if (method?.config) {
            const cfg = JSON.parse(method.config);
            // Support both snake_case and camelCase
            const login = cfg.login || cfg.Login;
            const merchant = cfg.merchant || cfg.Merchant || cfg.merchant_id;
            const key = mode === "test"
                ? (cfg.test_key ?? cfg.testKey ?? cfg.key)
                : (cfg.key ?? cfg.Key);
            const testKey = cfg.test_key ?? cfg.testKey;

            if (login && merchant && key) {
                return {
                    merchant: String(merchant),
                    login: String(login),
                    key: String(key),
                    testKey: testKey ? String(testKey) : undefined,
                };
            }
            console.warn("[payme] DB config to'liq emas — login/merchant/key yo'q.");
        }
    } catch (e) {
        console.warn("[payme] DB config o'qishda xato:", e);
    }

    // 2) Env fallback
    const envLogin = process.env.PAYME_LOGIN;
    const envMerchant = process.env.PAYME_MERCHANT_ID;
    const envKey = mode === "test"
        ? (process.env.PAYME_TEST_KEY ?? process.env.PAYME_KEY)
        : process.env.PAYME_KEY;

    if (envLogin && envMerchant && envKey) {
        return {
            merchant: envMerchant,
            login: envLogin,
            key: envKey,
            testKey: process.env.PAYME_TEST_KEY,
        };
    }

    return null;
}

// ---------------------------------------------------------------------------
// RPC helper
// ---------------------------------------------------------------------------

const PAYME_BASE_URL = "https://payment.paycomjoint.uz";
const PAYME_TEST_URL = "https://test.paycom.uz";

/** Hozirgi vaqt (Unix millisecond) */
export function nowMs(): number {
    return Date.now();
}

/** HMAC-SHA256 imzo (Payme standard) */
async function signPayload(payload: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(key),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Payme Merchant API ga so'rov yuborish */
export async function paymeRpc(
    method: string,
    params: Record<string, unknown>,
    mode: PaymeMode = "production"
): Promise<{ result: unknown; error: { code: number; message: string; data: unknown[] } | null }> {
    const config = await getPaymeConfig(mode);
    if (!config) {
        return {
            result: null,
            error: { code: -32400, message: "Payme config not found", data: [] },
        };
    }

    const key = mode === "test" ? (config.testKey ?? config.key) : config.key;
    const url = mode === "test" ? PAYME_TEST_URL : PAYME_BASE_URL;

    const payload = JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id: Math.floor(Math.random() * 100000),
    });

    const signature = await signPayload(payload, key);

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(`${config.login}:${signature}`)}`,
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers,
            body: payload,
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
            console.error(`[payme] HTTP ${res.status} for ${method}`, await res.text().catch(() => ""));
            return {
                result: null,
                error: { code: -32400, message: `HTTP ${res.status}`, data: [] },
            };
        }

        const data = await res.json() as { result?: unknown; error?: { code: number; message: string; data: unknown[] } };
        if (data.error) return { result: null, error: data.error };
        return { result: data.result ?? null, error: null };
    } catch (e: unknown) {
        const msg = (e as { message?: string }).message ?? String(e);
        console.error(`[payme] ${method} error:`, msg);
        return {
            result: null,
            error: { code: -32400, message: msg, data: [] },
        };
    }
}

// ---------------------------------------------------------------------------
// Transaction model (Payme side)
// ---------------------------------------------------------------------------

/** Payme transaction holati */
export enum PaymeTransactionState {
    Created = 0,
    Pending = 1,
    Performed = 2,
    Cancelled = -1,
}

/** Payme transaction — bizning tizimda saqlanadi */
export interface PaymeTransactionData {
    id: string;           // Payme transaction ID
    time: number;         // creation timestamp ms
    amount: number;       // tiyinlarda
    accountOrder: string; // order_id
    transaction: string;  // bizning internal ID
    state: PaymeTransactionState;
    create_time: number;
    perform_time?: number;
    cancel_time?: number;
    reason?: number | null;
}

// ---------------------------------------------------------------------------
// CheckPerformTransaction
// ---------------------------------------------------------------------------

export async function handleCheckPerformTransaction(
    amount: number,
    account: { order_id: string }
): Promise<{ allow: boolean }> {
    const orderId = account.order_id;
    if (!orderId) {
        throw { code: -31000, message: "Invalid params: order_id required", data: [{ field: "account.order_id" }] };
    }

    const order = await prisma.order.findFirst({
        where: {
            OR: [
                { id: orderId },
                { orderNumber: orderId },
            ],
        },
        select: { id: true, total: true, paymentStatus: true, status: true },
    });

    if (!order) {
        throw { code: -31003, message: "Order not found", data: [{ field: "account.order_id" }] };
    }

    // Allaqachon to'langan
    if (order.paymentStatus === "PAID") {
        throw { code: -31001, message: "Transaction already performed", data: [] };
    }

    // To'lov summasi mosligini tekshirish (1 tiyin xato bilan)
    const orderAmountTiyin = Math.round(order.total * 100);
    if (Math.abs(amount - orderAmountTiyin) > 1) {
        throw { code: -31001, message: "Invalid amount", data: [] };
    }

    return { allow: true };
}

// ---------------------------------------------------------------------------
// CreateTransaction
// ---------------------------------------------------------------------------

export async function handleCreateTransaction(
    id: string,
    time: number,
    amount: number,
    account: { order_id: string }
): Promise<{
    create_time: number;
    transaction: string;
    state: PaymeTransactionState;
}> {
    const orderId = account.order_id;

    // Idempotent: agar transaction allaqachon mavjud bo'lsa, natijani qaytar
    const existing = await prisma.order.findFirst({
        where: { paymeTransactionId: id },
        select: { paymeTransactionId: true, paymentStatus: true },
    });
    if (existing) {
        return {
            create_time: time,
            transaction: id,
            state: existing.paymentStatus === "PAID" ? PaymeTransactionState.Performed : PaymeTransactionState.Created,
        };
    }

    // Order topish
    const order = await prisma.order.findFirst({
        where: {
            OR: [{ id: orderId }, { orderNumber: orderId }],
        },
        select: { id: true, total: true, paymentStatus: true, status: true },
    });

    if (!order) {
        throw { code: -31003, message: "Order not found", data: [{ field: "account.order_id" }] };
    }

    // Summa tekshirish
    const orderAmountTiyin = Math.round(order.total * 100);
    if (Math.abs(amount - orderAmountTiyin) > 1) {
        throw { code: -31001, message: "Invalid amount", data: [] };
    }

    // Allaqachon to'langan
    if (order.paymentStatus === "PAID") {
        // Transaction yaratib, holatni Performed deb qaytamiz
        await prisma.order.updateMany({
            where: { id: order.id },
            data: { paymeTransactionId: id },
        });
        return { create_time: time, transaction: id, state: PaymeTransactionState.Performed };
    }

    // Order statusini AWAITING_PAYMENT ga o'tkazish
    await prisma.order.update({
        where: { id: order.id },
        data: {
            paymentStatus: "AWAITING_PAYMENT",
            paymeTransactionId: id,
            paymentProvider: "PAYME",
        },
    });

    // PaymentLog yozish
    await prisma.paymentLog.create({
        data: {
            provider: "PAYME",
            transactionId: id,
            amount: order.total,
            status: "REQUEST_RECEIVED",
            requestData: JSON.stringify({ method: "CreateTransaction", account: orderId, amount }),
        },
    });

    return {
        create_time: time,
        transaction: id,
        state: PaymeTransactionState.Created,
    };
}

// ---------------------------------------------------------------------------
// PerformTransaction
// ---------------------------------------------------------------------------

export async function handlePerformTransaction(
    id: string
): Promise<{
    transaction: string;
    perform_time: number;
    state: PaymeTransactionState;
}> {
    // Idempotent: allaqachon performed bo'lsa
    const existing = await prisma.order.findFirst({
        where: { paymeTransactionId: id },
        select: { paymentStatus: true, paymeTransactionId: true },
    });

    if (existing?.paymentStatus === "PAID") {
        return {
            transaction: id,
            perform_time: nowMs(),
            state: PaymeTransactionState.Performed,
        };
    }

    const order = await prisma.order.findFirst({
        where: { paymeTransactionId: id },
        select: { id: true, total: true },
    });

    if (!order) {
        throw { code: -31003, message: "Transaction not found", data: [] };
    }

    // To'lovni amalga oshirish
    await prisma.order.update({
        where: { id: order.id },
        data: {
            paymentStatus: "PAID",
            paymentProvider: "PAYME",
        },
    });

    // PaymentLog
    await prisma.paymentLog.create({
        data: {
            provider: "PAYME",
            transactionId: id,
            amount: order.total,
            status: "SUCCESS",
            responseData: JSON.stringify({ method: "PerformTransaction", state: PaymeTransactionState.Performed }),
        },
    });

    // Invoice yaratish (async, xato bo'lsa log'ga yoziladi)
    import("@/lib/invoice/invoice-service").then(({ createInvoiceForOrder }) => {
        createInvoiceForOrder(order.id, { force: true }).catch((e: unknown) => {
            console.error("[payme] Invoice creation failed:", e);
        });
    }).catch(() => {});

    return {
        transaction: id,
        perform_time: nowMs(),
        state: PaymeTransactionState.Performed,
    };
}

// ---------------------------------------------------------------------------
// CancelTransaction
// ---------------------------------------------------------------------------

export async function handleCancelTransaction(
    id: string,
    time: number,
    reason?: number | null
): Promise<{
    cancel_time: number;
    transaction: string;
    state: PaymeTransactionState;
    reason?: number | null;
}> {
    const order = await prisma.order.findFirst({
        where: { paymeTransactionId: id },
        select: { id: true, paymentStatus: true, status: true },
    });

    if (!order) {
        throw { code: -31003, message: "Transaction not found", data: [] };
    }

    // Allaqachon cancelled
    if (order.paymentStatus === "CANCELLED" || order.paymentStatus === "PAYMENT_CANCELLED") {
        return { cancel_time: time, transaction: id, state: PaymeTransactionState.Cancelled, reason };
    }

    // Bajarilgan transactionni bekor qilish — Payme qoidasiga ko'ra refund kerak
    // Hozircha faqat statusni yangilaymiz
    await prisma.order.update({
        where: { id: order.id },
        data: {
            paymentStatus: "PAYMENT_CANCELLED",
        },
    });

    return {
        cancel_time: time,
        transaction: id,
        state: PaymeTransactionState.Cancelled,
        reason,
    };
}

// ---------------------------------------------------------------------------
// CheckTransaction
// ---------------------------------------------------------------------------

export async function handleCheckTransaction(
    id: string
): Promise<{
    create_time: number;
    perform_time?: number;
    cancel_time?: number;
    transaction: string;
    state: PaymeTransactionState;
    reason?: number | null;
}> {
    const order = await prisma.order.findFirst({
        where: { paymeTransactionId: id },
        select: {
            id: true,
            paymentStatus: true,
            paymeTransactionId: true,
            createdAt: true,
        },
    });

    if (!order) {
        throw { code: -31003, message: "Transaction not found", data: [] };
    }

    let state: PaymeTransactionState;
    let performTime: number | undefined;
    let cancelTime: number | undefined;
    let txReason: number | null = null;

    switch (order.paymentStatus) {
        case "PAID":
            state = PaymeTransactionState.Performed;
            break;
        case "PAYMENT_CANCELLED":
            state = PaymeTransactionState.Cancelled;
            txReason = 4; // timeout cancellation
            break;
        case "CANCELLED":
            state = PaymeTransactionState.Cancelled;
            break;
        default:
            state = PaymeTransactionState.Created;
    }

    return {
        create_time: order.createdAt.getTime(),
        perform_time: performTime,
        cancel_time: cancelTime,
        transaction: id,
        state,
        reason: txReason,
    };
}

// ---------------------------------------------------------------------------
// GetStatement
// ---------------------------------------------------------------------------

export async function handleGetStatement(
    from: number,
    to: number
): Promise<{
    transactions: Array<{
        id: string;
        time: number;
        amount: number;
        account: { order_id: string };
        create_time: number;
        perform_time?: number;
        cancel_time?: number;
        transaction: string;
        state: PaymeTransactionState;
        reason?: number | null;
    }>;
}> {
    const orders = await prisma.order.findMany({
        where: {
            paymentProvider: "PAYME",
            paymeTransactionId: { not: null },
            createdAt: {
                gte: new Date(from),
                lte: new Date(to),
            },
        },
        select: {
            id: true,
            orderNumber: true,
            total: true,
            paymentStatus: true,
            paymeTransactionId: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    });

    const transactions = orders.map((o: any) => {
        let state: PaymeTransactionState;
        switch (o.paymentStatus) {
            case "PAID": state = PaymeTransactionState.Performed; break;
            case "PAYMENT_CANCELLED": state = PaymeTransactionState.Cancelled; break;
            case "CANCELLED": state = PaymeTransactionState.Cancelled; break;
            default: state = PaymeTransactionState.Created;
        }

        return {
            id: o.paymeTransactionId!,
            time: o.createdAt.getTime(),
            amount: Math.round(o.total * 100), // tiyin
            account: { order_id: o.id },
            create_time: o.createdAt.getTime(),
            transaction: o.paymeTransactionId!,
            state,
        };
    });

    return { transactions };
}

// ---------------------------------------------------------------------------
// Redirect checkout URL
// ---------------------------------------------------------------------------

/**
 * Payme GET formatidagi redirect URL (rasmiy: https://developer.help.paycom.uz/)
 * Format: https://checkout.paycom.uz/base64(m=...;ac.order_id=...;a=...;l=...)
 */
export function buildPaymeRedirectUrl(
    config: PaymeConfig,
    orderId: string,
    amountSom: number,
    options: {
        lang?: "ru" | "uz" | "en";
        callback?: string;
        callbackTimeout?: number;
        description?: string;
    } = {}
): string {
    const amountTiyin = Math.round(amountSom * 100);
    const lang = options.lang ?? "uz";

    // GET parametri: m=merchant;ac.order_id=orderId;a=amount;...
    const params = [`m=${config.merchant}`, `ac.order_id=${orderId}`, `a=${amountTiyin}`, `l=${lang}`];
    if (options.callback) params.push(`c=${encodeURIComponent(options.callback)}`);
    if (options.callbackTimeout) params.push(`ct=${options.callbackTimeout}`);
    if (options.description) params.push(`description=${encodeURIComponent(options.description)}`);

    const encoded = btoa(params.join(";"));
    return `https://checkout.paycom.uz/${encoded}`;
}

/**
 * @deprecated — eski funksiyani saqlab qoldik, lekin ichida buildPaymeRedirectUrl ishlatiladi.
 */
export function buildPaymeGetUrl(
    config: PaymeConfig,
    orderId: string,
    amountSom: number,
    options: {
        lang?: "ru" | "uz" | "en";
        callback?: string;
    } = {}
): string {
    return buildPaymeRedirectUrl(config, orderId, amountSom, options);
}
