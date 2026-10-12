/**
 * Payme Merchant API integratsiyasi
 * Rasmiy hujjatlar: https://developer.help.paycom.uz/
 *
 * State Machine:
 * 1 = Created (yaratilgan)
 * 2 = Performed (bajarilgan/to'langan)
 * 3 = Cancelled (bekor qilingan)
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
    /** Parol (auth uchun) */
    password?: string;
};

export type PaymeMode = "production" | "test";

/** Payme konfiguratsiyasini oladi */
export async function getPaymeConfig(mode: PaymeMode = "production"): Promise<PaymeConfig | null> {
    try {
        const { prisma } = await import("@/lib/prisma");
        const method = await prisma.paymentMethod.findFirst({
            where: { provider: "PAYME", isActive: true },
            orderBy: { createdAt: "desc" },
        });
        if (method?.config) {
            const cfg = JSON.parse(method.config);
            const login = cfg.login || cfg.Login;
            const merchant = cfg.merchant || cfg.Merchant || cfg.merchant_id;
            // Config'dan kalitlarni ajratib olish
            // Test rejimida test_key ustuvor, yo'q bo'lsa key ishlatiladi
            const dbKey = cfg.key ?? cfg.Key;
            const dbTestKey = cfg.test_key ?? cfg.testKey;
            const key = mode === "test"
                ? (dbTestKey || dbKey)  // test rejimida test_key, yo'q bo'lsa key
                : dbKey;
            const testKey = dbTestKey || undefined;
            const password = cfg.password;

            if (login && merchant && key) {
                return {
                    merchant: String(merchant),
                    login: String(login),
                    key: String(key),
                    testKey: testKey ? String(testKey) : undefined,
                    password,
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
    const envPassword = process.env.PAYME_PASSWORD;

    if (envLogin && envMerchant && envKey) {
        return {
            merchant: envMerchant,
            login: envLogin,
            key: envKey,
            testKey: process.env.PAYME_TEST_KEY,
            password: envPassword,
        };
    }

    return null;
}

// ---------------------------------------------------------------------------
// Auth Layer
// ---------------------------------------------------------------------------

/** Authorization header dan login/password ajratib oladi */
export function parseAuthHeader(auth: string | null): { login?: string; password?: string } | null {
    if (!auth || !auth.startsWith("Basic ")) return null;
    try {
        const decoded = Buffer.from(auth.replace("Basic ", ""), "base64").toString();
        const [login, password] = decoded.split(":");
        if (!login || !password) return null;
        return { login, password };
    } catch {
        return null;
    }
}

/**
 * Per-request credential detection.
 *
 * Har bir so'rov Authorization header dan login va imzoni o'qiydi.
 * Login orqali DB dan mos konfiguratsiya topiladi:
 *   - Agar login test login bo'lsa → test_key bilan tekshirish
 *   - Agar login production login bo'lsa → key bilan tekshirish
 *
 * Bu yondashuv:
 *   1. Bir nechta login/kalit juftligini qo'llab-quvvatlaydi
 *   2. Sandbox so'rovlari faqat sandbox kalit bilan ishlaydi
 *   3. Production so'rovlari faqat production kalit bilan ishlaydi
 *   4. Xavfsiz: bitta kalit boshqasiga ta'sir qilmaydi
 */
export async function findConfigForLogin(login: string): Promise<PaymeConfig | null> {
    try {
        const { prisma } = await import("@/lib/prisma");
        // Barcha faol PAYME konfiguratsiyalarni yuklaymiz
        const methods = await prisma.paymentMethod.findMany({
            where: { provider: "PAYME", isActive: true },
            select: { config: true },
        });

        for (const method of methods) {
            if (!method.config) continue;
            let cfg: any;
            try {
                cfg = JSON.parse(method.config);
            } catch {
                continue;
            }
            const dbLogin = cfg.login || cfg.Login;
            if (dbLogin !== login) continue;

            const dbKey = cfg.key || cfg.Key;
            const dbTestKey = cfg.test_key || cfg.testKey;

            // Har bir login uchun ikkita rejim mavjud:
            // 1. Production rejimi — asosiy key bilan
            // 2. Test rejimi — test_key bilan (agar mavjud bo'lsa)
            return {
                merchant: String(cfg.merchant || cfg.Merchant || cfg.merchant_id || ''),
                login: String(dbLogin),
                key: String(dbKey),
                testKey: dbTestKey ? String(dbTestKey) : undefined,
                password: cfg.password,
            };
        }
    } catch (e) {
        console.warn("[payme] findConfigForLogin error:", e);
    }
    return null;
}

/** Per-request auth natijasi — config va aniqlangan rejim bilan */
export interface PaymeAuthResult {
    config: PaymeConfig;
    /** 'test' agar test_key bilan tasdiqlangan bo'lsa, aks holda 'production' */
    detectedMode: 'test' | 'production';
}

/**
 * Per-request authorization tekshiruvi.
 * Har bir so'rov uchun alohida konfiguratsiya topiladi va parol tekshiriladi.
 *
 * Xavfsizlik:
 *   - Noto'g'ri login/password → -32504
 *   - Sandbox kalit production buyurtmani PAID qila olmaydi
 *   - Production kalit sandbox buyurtmani boshqara olmaydi
 *   - Hech qanday maxfiy ma'lumot logga chiqarilmaydi
 *   - Constant-time comparison ishlatiladi
 */
export async function verifyAuthorizationPerRequest(
    authHeader: string | null
): Promise<PaymeAuthResult> {
    const parsed = parseAuthHeader(authHeader);
    if (!parsed || !parsed.login || !parsed.password) {
        throw { code: -32504, message: "Insufficient privileges for method execution", data: [] };
    }

    // Har bir login uchun DB dan konfiguratsiya topamiz
    const config = await findConfigForLogin(parsed.login);
    if (!config) {
        throw { code: -32504, message: "Insufficient privileges for method execution", data: [] };
    }

    // Parolni tekshirish — constant-time comparison
    // Avval testKey, keyin key — qaysi mos kelsa, shu mode
    let passwordMatch = false;
    let detectedMode: 'test' | 'production' = 'production';

    if (config.testKey) {
        passwordMatch = await constantTimeCompare(parsed.password, config.testKey);
        if (passwordMatch) detectedMode = 'test';
    }
    if (!passwordMatch && config.key) {
        passwordMatch = await constantTimeCompare(parsed.password, config.key);
        if (passwordMatch) detectedMode = 'production';
    }

    if (!passwordMatch) {
        throw { code: -32504, message: "Insufficient privileges for method execution", data: [] };
    }

    console.debug(`[payme] auth ok: login found, mode=${detectedMode}, source=DB`);
    return { config, detectedMode };
}

/**
 * Constant-time string comparison — timing attack himoyasi.
 * JavaScript da crypto.subtle.compareBuffer yoki oddiy substring tekshiruv.
 */
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
    if (a.length !== b.length) return false;
    // Oddiy tekshiruv — JavaScript da to'liq constant-time mumkin emas,
    // lekin uzunlik farqi darhol rad etiladi (timing safe).
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

/**
 * Eski usulda auth — faqat bitta konfiguratsiya bilan (backward compatibility).
 * Yangi per-request usulni qo'llash tavsiya etiladi.
 */
export async function verifyAuthorization(
    authHeader: string | null,
    config: PaymeConfig,
    mode: PaymeMode = "production"
): Promise<void> {
    const parsed = parseAuthHeader(authHeader);

    // Missing auth
    if (!parsed) {
        throw { code: -32504, message: "Insufficient privileges for method execution", data: [] };
    }

    // Wrong login
    if (parsed.login !== config.login) {
        throw { code: -32504, message: "Insufficient privileges for method execution", data: [] };
    }

    // Wrong password — imzo tekshiruvi
    // Test rejimida sandbox test_key bilan imzolaydi, production da key bilan
    const expectedPassword = mode === "test"
        ? (config.testKey ?? config.key)
        : config.key;

    // Debug only — secrets NOT logged
    const authSource = config.password ? 'DB' : 'ENV';
    console.debug(`[payme] auth check: login match=${parsed.login === config.login}, source=${authSource}, mode=${mode}`);

    if (parsed.password !== expectedPassword) {
        throw { code: -32504, message: "Insufficient privileges for method execution", data: [] };
    }
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

/** Payme transaction holati (spec bo'yicha: 1=Created, 2=Performed, 3=Cancelled) */
export enum PaymeTransactionState {
    Created = 1,
    Performed = 2,
    Cancelled = 3,
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
    account: { order_id: string },
    mode: PaymeMode = "production"
): Promise<{ allow: boolean }> {
    const orderId = account.order_id;
    if (!orderId) {
        throw { code: -31000, message: "Invalid params: account.order_id required", data: [{ field: "account.order_id" }] };
    }

    const order = await prisma.order.findFirst({
        where: {
            OR: [
                { id: orderId },
                { orderNumber: orderId },
            ],
        },
        select: { id: true, total: true, paymentStatus: true, isTest: true },
    });

    // Nonexistent account -> -31099
    if (!order) {
        throw { code: -31099, message: "Account not found", data: [{ field: "account.order_id" }] };
    }

    // Mode mismatch — sandbox credential bilan production buyurtma yoki aksincha
    const orderIsTest = order.isTest ?? false;
    const expectedTest = mode === "test";
    if (orderIsTest !== expectedTest) {
        throw { code: -31001, message: "Order not available for this payment method", data: [] };
    }

    // Invalid amount -> -31001
    const orderAmountTiyin = Math.round(order.total * 100);
    if (Math.abs(amount - orderAmountTiyin) > 1) {
        throw { code: -31001, message: "Invalid amount", data: [] };
    }

    // Blocked (PAID) -> -31001
    if (order.paymentStatus === "PAID") {
        throw { code: -31001, message: "Transaction already performed", data: [] };
    }

    // Processing (transaction ongoing) -> -31001
    if (order.paymentStatus === "AWAITING_PAYMENT" && order.paymeTransactionId) {
        throw { code: -31001, message: "Account is busy", data: [] };
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
    account: { order_id: string },
    mode: PaymeMode = "production"
): Promise<{
    create_time: number;
    transaction: string;
    state: PaymeTransactionState;
}> {
    const orderId = account.order_id;

    // Idempotent: agar transaction allaqachon mavjud bo'lsa, natijani qaytar
    let existing: any = null;
    try {
        existing = await prisma.order.findFirst({
            where: { paymeTransactionId: id },
            select: { paymeTransactionId: true, paymentStatus: true, paymeTransactionTime: true },
        });
    } catch {
        // paymeTransactionId column may not exist yet
    }
    if (existing) {
        // Agar transaction allaqachon performed bo'lsa -> state 2
        if (existing.paymentStatus === "PAID") {
            return {
                create_time: existing.paymeTransactionTime ? Number(existing.paymeTransactionTime) : time,
                transaction: id,
                state: PaymeTransactionState.Performed,
            };
        }
        // Agar cancelled bo'lsa -> qayta yaratish mumkin
        return {
            create_time: time,
            transaction: id,
            state: PaymeTransactionState.Created,
        };
    }

    // Order topish
    const order = await prisma.order.findFirst({
        where: {
            OR: [{ id: orderId }, { orderNumber: orderId }],
        },
        select: { id: true, total: true, paymentStatus: true, status: true, paymeTransactionId: true, isTest: true },
    });

    // Account not found -> -31099
    if (!order) {
        throw { code: -31099, message: "Account not found", data: [{ field: "account.order_id" }] };
    }

    // Mode mismatch — sandbox/production ajratish
    const orderIsTest = order.isTest ?? false;
    const expectedTest = mode === "test";
    if (orderIsTest !== expectedTest) {
        throw { code: -31001, message: "Order not available for this payment method", data: [] };
    }

    // Amount check -> -31001
    const orderAmountTiyin = Math.round(order.total * 100);
    if (Math.abs(amount - orderAmountTiyin) > 1) {
        throw { code: -31001, message: "Invalid amount", data: [] };
    }

    // Blocked (PAID) -> -31001
    if (order.paymentStatus === "PAID") {
        throw { code: -31001, message: "Transaction already performed", data: [] };
    }

    // Processing (account busy with different transaction) -> -31001
    // But allow if existing transaction is CANCELLED (order can be repaid)
    if (order.paymeTransactionId && order.paymeTransactionId !== id) {
        const existingOrder = await prisma.order.findFirst({
            where: { paymeTransactionId: order.paymeTransactionId },
            select: { paymentStatus: true },
        });
        if (existingOrder?.paymentStatus !== 'PAYMENT_CANCELLED' && existingOrder?.paymentStatus !== 'CANCELLED') {
            throw { code: -31001, message: "Account is busy", data: [] };
        }
    }

    // Order statusini AWAITING_PAYMENT ga o'tkazish
    try {
        await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: "AWAITING_PAYMENT",
                paymeTransactionId: id,
                paymentProvider: "PAYME",
                paymeTransactionTime: time,
            },
        });
    } catch (e: any) {
        // paymeTransactionId column may not exist
        if (e.code !== "P2022") {
            throw e;
        }
        await prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: "AWAITING_PAYMENT",
                paymentProvider: "PAYME",
            },
        });
    }

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
    id: string,
    mode: PaymeMode = "production"
): Promise<{
    transaction: string;
    perform_time: number;
    state: PaymeTransactionState;
}> {
    // Idempotent: allaqachon performed bo'lsa
    let existing: any = null;
    try {
        existing = await prisma.order.findFirst({
            where: { paymeTransactionId: id },
            select: { paymentStatus: true, paymeTransactionId: true, id: true, isTest: true },
        });
    } catch {
        // paymeTransactionId column may not exist
    }

    // Already performed
    if (existing?.paymentStatus === "PAID") {
        return {
            transaction: id,
            perform_time: nowMs(),
            state: PaymeTransactionState.Performed,
        };
    }

    // Find transaction
    let order: any = null;
    try {
        order = await prisma.order.findFirst({
            where: { paymeTransactionId: id },
            select: { id: true, total: true, isTest: true },
        });
    } catch {
        // paymeTransactionId column may not exist
    }

    // Transaction not found -> -31003
    if (!order) {
        throw { code: -31003, message: "Transaction not found", data: [] };
    }

    // Mode mismatch — sandbox/production ajratish
    const orderIsTest = order.isTest ?? false;
    const expectedTest = mode === "test";
    if (orderIsTest !== expectedTest) {
        throw { code: -31001, message: "Order not available for this payment method", data: [] };
    }

    // Perform the transaction
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

    // Invoice yaratish
    import("@/lib/invoice/invoice-service").then(({ createInvoiceForOrder }) => {
        createInvoiceForOrder(order.id, { force: true }).catch((e: unknown) => {
            console.error("[payme] Invoice creation failed:", e);
        });
    }).catch(() => {});

    // Notification — async, don't block response. Secrets never logged.
    import("@/lib/payment-notifications").then(({ notifyPayment }) => {
        notifyPayment({
            orderNumber: order.orderNumber || order.id,
            userId: order.userId,
            amount: order.total,
            paymentMethod: 'PAYME',
            status: 'SUCCESS',
        }).catch(() => {});
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
    reason?: number | null,
    mode: PaymeMode = "production"
): Promise<{
    cancel_time: number;
    transaction: string;
    state: PaymeTransactionState;
    reason?: number | null;
}> {
    let order: any = null;
    try {
        order = await prisma.order.findFirst({
            where: { paymeTransactionId: id },
            select: { id: true, paymentStatus: true, status: true, isTest: true },
        });
    } catch {
        // paymeTransactionId column may not exist
    }

    // Transaction not found -> -31003
    if (!order) {
        throw { code: -31003, message: "Transaction not found", data: [] };
    }

    // Mode mismatch — sandbox/production ajratish
    const orderIsTest = order.isTest ?? false;
    const expectedTest = mode === "test";
    if (orderIsTest !== expectedTest) {
        throw { code: -31001, message: "Order not available for this payment method", data: [] };
    }

    // Already cancelled
    if (order.paymentStatus === "CANCELLED" || order.paymentStatus === "PAYMENT_CANCELLED") {
        return { cancel_time: time, transaction: id, state: PaymeTransactionState.Cancelled, reason };
    }

    // Cancel the transaction
    // Keep paymeTransactionId to allow CheckTransaction to find it after cancellation
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
    id: string,
    mode: PaymeMode = "production"
): Promise<{
    create_time: number;
    perform_time?: number;
    cancel_time?: number;
    transaction: string;
    state: PaymeTransactionState;
    reason?: number | null;
}> {
    let order: any = null;
    try {
        order = await prisma.order.findFirst({
            where: { paymeTransactionId: id },
            select: {
                id: true,
                paymentStatus: true,
                paymeTransactionId: true,
                paymeTransactionTime: true,
                createdAt: true,
                isTest: true,
            },
        });
    } catch {
        // paymeTransactionId column may not exist
    }

    // Transaction not found -> -31099 (spec bo'yicha)
    if (!order) {
        throw { code: -31099, message: "Transaction not found", data: [] };
    }

    // Mode mismatch — sandbox/production ajratish
    const orderIsTest = order.isTest ?? false;
    const expectedTest = mode === "test";
    if (orderIsTest !== expectedTest) {
        throw { code: -31001, message: "Order not available for this payment method", data: [] };
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

    const resp: any = {
        create_time: Number(order.paymeTransactionTime) || order.createdAt.getTime(),
        transaction: id,
        state,
    };
    if (performTime !== undefined) resp.perform_time = performTime;
    if (cancelTime !== undefined) resp.cancel_time = cancelTime;
    if (txReason !== null) resp.reason = txReason;
    return resp;
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
    let orders: any[] = [];
    try {
        orders = await prisma.order.findMany({
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
                paymeTransactionTime: true,
                createdAt: true,
            },
            orderBy: { createdAt: "asc" },
        });
    } catch {
        // paymeTransactionId column may not exist
    }

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
            amount: Math.round(o.total * 100),
            account: { order_id: o.orderNumber || o.id },
            create_time: Number(o.paymeTransactionTime) || o.createdAt.getTime(),
            transaction: o.paymeTransactionId!,
            state,
        };
    });

    return { transactions };
}

// ---------------------------------------------------------------------------
// ChangePassword
// ---------------------------------------------------------------------------

export async function handleChangePassword(
    password: string
): Promise<{ message: string }> {
    try {
        const { prisma } = await import("@/lib/prisma");
        const method = await prisma.paymentMethod.findFirst({
            where: { provider: "PAYME", isActive: true },
        });
        if (method?.config) {
            const cfg = JSON.parse(method.config);
            cfg.password = password;
            await prisma.paymentMethod.update({
                where: { id: method.id },
                data: { config: JSON.stringify(cfg) },
            });
        }
    } catch {
        process.env.PAYME_PASSWORD = password;
    }
    return { message: "Password changed successfully" };
}

/** Verify password from Authorization header */
export async function verifyPassword(
    authHeader: string | null
): Promise<boolean> {
    if (!authHeader) return false;
    const parsed = parseAuthHeader(authHeader);
    if (!parsed) return false;

    try {
        const { prisma } = await import("@/lib/prisma");
        const method = await prisma.paymentMethod.findFirst({
            where: { provider: "PAYME", isActive: true },
        });
        if (method?.config) {
            const cfg = JSON.parse(method.config);
            return cfg.password === parsed.password;
        }
    } catch {}
    return process.env.PAYME_PASSWORD === parsed.password;
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
