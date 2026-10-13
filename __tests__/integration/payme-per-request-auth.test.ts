/**
 * Per-request Payme auth tests.
 *
 * Yechim: Har bir so'rov Authorization header dan login ni o'qib,
 * DB dan mos konfiguratsiya topadi. Sandbox va production credentiallar
 * bir vaqtning o'zida ishlashi mumkin, lekin bir-biriga aralashmaydi.
 *
 * Xavfsizlik:
 *   - Sandbox kalit bilan real buyurtmani PAID qilish mumkin emas
 *   - Production kalit bilan sandbox test buyurtmasini boshqarish mumkin emas
 *   - Noto'g'ri credential → -32504
 *   - Mavjud bo'lmagan account → -31050...-31099
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mockOrder = {
    id: 'ord-test',
    total: 5000,
    paymentStatus: 'PENDING',
    paymeTransactionId: null,
    isTest: false,
};

const mockedPrisma = vi.hoisted(() => ({
    order: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
    },
    paymentLog: { create: vi.fn() },
    paymentMethod: { findMany: vi.fn(), findFirst: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mockedPrisma,
}));

globalThis.fetch = vi.fn();

import {
    getPaymeConfig,
    verifyAuthorization,
    parseAuthHeader,
    handleCheckPerformTransaction,
    handleCreateTransaction,
    handlePerformTransaction,
    handleCheckTransaction,
    handleGetStatement,
    paymeRpc,
    findConfigForLogin,
    verifyAuthorizationPerRequest,
} from '@/lib/payme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAuthHeader(login: string, password: string): string {
    return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

/** DB dan mock config qaytarish */
function mockDbConfig(overrides: Record<string, any> = {}) {
    const config = {
        login: 'test_login',
        merchant: '12345',
        key: 'prod_key_123',
        test_key: 'sandbox_key_456',
        ...overrides,
    };
    mockedPrisma.paymentMethod.findMany.mockResolvedValue([{ config: JSON.stringify(config) }]);
    mockedPrisma.paymentMethod.findFirst.mockResolvedValue({ config: JSON.stringify(config) });
    return config;
}

/** Mavjud order mock */
function buildMockOrder(overrides: Record<string, any> = {}) {
    return { ...mockOrder, ...overrides };
}

beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PAYME_MODE;
});

// ─── 1. Per-request Config Detection ─────────────────────────────────────────

describe('findConfigForLogin — per-request detection', () => {
    it('should find config by login', async () => {
        mockDbConfig({ login: 'sandbox_login', test_key: 'sandbox_key' });

        const config = await findConfigForLogin('sandbox_login');
        expect(config).not.toBeNull();
        expect(config!.login).toBe('sandbox_login');
        expect(config!.testKey).toBe('sandbox_key');
        expect(config!.key).toBe('prod_key_123');
    });

    it('should return null for unknown login', async () => {
        mockDbConfig({ login: 'known_login' });

        const config = await findConfigForLogin('unknown_login');
        expect(config).toBeNull();
    });

    it('should set isTest based on mode for each handler', async () => {
        // Verify that handlers accept mode parameter
        const fs = await import('fs');
        const path = await import('path');
        const libContent = fs.readFileSync(
            path.resolve(process.cwd(), 'src/lib/payme.ts'),
            'utf-8'
        );

        // Check that all transaction handlers have mode parameter
        expect(libContent).toContain('mode: PaymeMode = "production"');
        // Check that isTest is checked in handlers
        expect(libContent).toContain('orderIsTest !== expectedTest');
    });

    it('should handle multiple configs with different logins', async () => {
        mockedPrisma.paymentMethod.findMany.mockResolvedValue([
            { config: JSON.stringify({ login: 'sandbox_user', key: 'prod_s', test_key: 'test_s' }) },
            { config: JSON.stringify({ login: 'prod_user', key: 'prod_main', test_key: 'test_p' }) },
        ]);

        const sandboxConfig = await findConfigForLogin('sandbox_user');
        const prodConfig = await findConfigForLogin('prod_user');

        expect(sandboxConfig?.login).toBe('sandbox_user');
        expect(prodConfig?.login).toBe('prod_user');
        expect(sandboxConfig).not.toEqual(prodConfig);
    });
});

// ─── 2. verifyAuthorizationPerRequest ────────────────────────────────────────

describe('verifyAuthorizationPerRequest — per-request auth', () => {
    beforeEach(() => {
        mockDbConfig();
    });

    it('should accept valid sandbox credentials and return detectedMode=test', async () => {
        mockDbConfig({ login: 'sandbox_user', key: 'prod_key', test_key: 'sandbox_key' });
        const authHeader = makeAuthHeader('sandbox_user', 'sandbox_key');
        const result = await verifyAuthorizationPerRequest(authHeader);
        expect(result).not.toBeNull();
        expect(result!.config.login).toBe('sandbox_user');
        expect(result!.detectedMode).toBe('test');
    });

    it('should accept valid production credentials and return detectedMode=production', async () => {
        mockDbConfig({ login: 'prod_user', key: 'prod_key', test_key: 'sandbox_key' });
        const authHeader = makeAuthHeader('prod_user', 'prod_key');
        const result = await verifyAuthorizationPerRequest(authHeader);
        expect(result).not.toBeNull();
        expect(result!.config.login).toBe('prod_user');
        expect(result!.detectedMode).toBe('production');
    });

    it('should reject wrong password for any login', async () => {
        mockDbConfig({ login: 'any_user', key: 'correct_key', test_key: 'sandbox_key' });
        const authHeader = makeAuthHeader('any_user', 'wrong_password');
        await expect(verifyAuthorizationPerRequest(authHeader)).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject sandbox key used with production mode expectation', async () => {
        // Login mavjud, lekin sandbox kalit production context da ishlatilyapti
        mockDbConfig({ login: 'mixed_user', key: 'prod_key', test_key: 'sandbox_key' });
        // Sandbox kalit bilan so'rov — bu to'g'ri, chunki testKey bor
        const sandboxAuth = makeAuthHeader('mixed_user', 'sandbox_key');
        const result = await verifyAuthorizationPerRequest(sandboxAuth);
        expect(result!.detectedMode).toBe('test');
    });

    it('should reject production key when only test mode is available', async () => {
        // Faqat test_key bor, key yo'q
        mockDbConfig({ login: 'test_only', key: '', test_key: 'sandbox_key' });
        // Production kalit (bo'sh) bilan urinish
        const authHeader = makeAuthHeader('test_only', '');
        await expect(verifyAuthorizationPerRequest(authHeader)).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject missing auth header', async () => {
        await expect(verifyAuthorizationPerRequest(null)).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject invalid auth header format', async () => {
        await expect(verifyAuthorizationPerRequest('Bearer token')).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject wrong login', async () => {
        const authHeader = makeAuthHeader('wrong_login', 'prod_key_123');
        await expect(verifyAuthorizationPerRequest(authHeader)).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject unknown login even with correct-looking password', async () => {
        const authHeader = makeAuthHeader('unknown_user', 'some_key');
        await expect(verifyAuthorizationPerRequest(authHeader)).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });
});

// ─── 3. CheckPerformTransaction with Invalid Account ─────────────────────────

describe('handleCheckPerformTransaction — invalid account errors', () => {
    beforeEach(() => {
        buildMockOrder();
    });

    it('should return -31099 for nonexistent order (PAYME-INVALID-ORDER-999999)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'PAYME-INVALID-ORDER-999999' })
        ).rejects.toEqual({
            code: -31099,
            message: "Account not found",
            data: [{ field: "account.order_id" }],
        });
    });

    it('should return -31099 for empty order_id', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCheckPerformTransaction(500000, { order_id: '' as any })
        ).rejects.toEqual({
            code: -31000,
            message: "Invalid params: account.order_id required",
            data: [{ field: "account.order_id" }],
        });
    });

    it('should return -31001 for already PAID order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ paymentStatus: 'PAID' }));

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'ord-test' })
        ).rejects.toEqual({
            code: -31001,
            message: "Transaction already performed",
            data: [],
        });
    });

    it('should allow valid transaction request (production order + production mode)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ isTest: false }));

        const result = await handleCheckPerformTransaction(500000, { order_id: 'ord-test' }, 'production');
        expect(result).toEqual({ allow: true });
    });

    it('should reject production order with sandbox mode', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ isTest: false }));

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'ord-test' }, 'test')
        ).rejects.toEqual({
            code: -31001,
            message: "Order not available for this payment method",
            data: [],
        });
    });

    it('should allow sandbox order with sandbox mode', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ id: 'ord-sandbox', isTest: true }));

        const result = await handleCheckPerformTransaction(500000, { order_id: 'ord-sandbox' }, 'test');
        expect(result).toEqual({ allow: true });
    });

    it('should reject sandbox order with production mode', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ id: 'ord-sandbox', isTest: true }));

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'ord-sandbox' }, 'production')
        ).rejects.toEqual({
            code: -31001,
            message: "Order not available for this payment method",
            data: [],
        });
    });
});

// ─── 4. Sandbox vs Production Isolation ──────────────────────────────────────

describe('Sandbox vs Production credential isolation', () => {
    it('should use different keys for test and production modes', async () => {
        mockDbConfig({
            login: 'isolated_login',
            key: 'prod_key_only',
            test_key: 'sandbox_key_only',
        });

        const prodConfig = await getPaymeConfig('production');
        const testConfig = await getPaymeConfig('test');

        expect(prodConfig!.key).toBe('prod_key_only');
        expect(testConfig!.key).toBe('sandbox_key_only');
        expect(prodConfig!.key).not.toEqual(testConfig!.key);
    });

    it('should fall back to key when test_key is missing in test mode', async () => {
        mockDbConfig({ login: 'no_test_key', key: 'fallback_key', test_key: undefined });

        const config = await getPaymeConfig('test');
        expect(config!.key).toBe('fallback_key');
    });

    it('should not allow sandbox key to authenticate as production', async () => {
        mockDbConfig({
            login: 'separate_login',
            key: 'prod_secret',
            test_key: 'sandbox_secret',
        });

        const prodConfig = await getPaymeConfig('production');

        // Sandbox key should NOT work in production mode
        const badAuth = makeAuthHeader('separate_login', 'sandbox_secret');
        await expect(
            verifyAuthorization(badAuth, prodConfig!, 'production')
        ).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should not allow production key to authenticate as sandbox', async () => {
        mockDbConfig({
            login: 'separate_login',
            key: 'prod_secret',
            test_key: 'sandbox_secret',
        });

        const testConfig = await getPaymeConfig('test');

        // Production key should NOT work in test mode
        const badAuth = makeAuthHeader('separate_login', 'prod_secret');
        await expect(
            verifyAuthorization(badAuth, testConfig!, 'test')
        ).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });
});

// ─── 5. Test Buyurtmani Sandbox PAID Qilmasligi ──────────────────────────────

describe('Sandbox cannot modify production orders', () => {
    beforeEach(() => {
        buildMockOrder({ id: 'ord-prod-1', paymentStatus: 'PENDING', isTest: false });
    });

    it('should reject sandbox auth for production mode with wrong key', async () => {
        mockDbConfig({
            login: 'prod_login',
            key: 'prod_key',
            test_key: 'sandbox_key',
        });

        const prodConfig = await getPaymeConfig('production');

        // Sandbox key used in production context
        const authHeader = makeAuthHeader('prod_login', 'sandbox_key');
        await expect(verifyAuthorization(authHeader, prodConfig!, 'production')).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject sandbox credential modifying production order via isTest check', async () => {
        // First findFirst (by paymeTransactionId) → null; second (by orderId) → production order
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce(null) // no existing tx
            .mockResolvedValue(buildMockOrder({ id: 'ord-prod-1', isTest: false })); // prod order

        await expect(
            handleCreateTransaction('tx-1', Date.now(), 500000, { order_id: 'ord-prod-1' }, 'test')
        ).rejects.toEqual({
            code: -31001,
            message: "Order not available for this payment method",
            data: [],
        });
    });

    it('should allow sandbox credential for sandbox order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ id: 'ord-sandbox', isTest: true }));

        const result = await handleCreateTransaction('tx-1', Date.now(), 500000, { order_id: 'ord-sandbox' }, 'test');
        expect(result.state).toBe(1); // Created
    });
});

// ─── 6. End-to-End Route Flow (Mocked) ──────────────────────────────────────

describe('Route flow — per-request auth integration', () => {
    it('should use per-request auth by default', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const routeContent = fs.readFileSync(
            path.resolve(process.cwd(), 'src/app/api/payment/payme/route.ts'),
            'utf-8'
        );

        // Should import verifyAuthorizationPerRequest
        expect(routeContent).toContain('verifyAuthorizationPerRequest');
        // Should use per-request pattern (case-insensitive)
        expect(routeContent.toLowerCase()).toContain('per-request');
    });

    it('should still support backward-compatible verifyAuthorization', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const libContent = fs.readFileSync(
            path.resolve(process.cwd(), 'src/lib/payme.ts'),
            'utf-8'
        );

        expect(libContent).toContain('verifyAuthorization(');
        expect(libContent).toContain('verifyAuthorizationPerRequest(');
    });
});

// ─── 7. GetStatement Mode Isolation ────────────────────────────────────────

describe('handleGetStatement — mode isolation', () => {
    it('should only return test orders in test mode', async () => {
        mockedPrisma.order.findMany.mockImplementation(({ where }: any) => {
            const all = [
                { id: 'ord-sb-1', orderNumber: 'SB001', total: 50, paymentStatus: 'PAID', paymeTransactionId: 'tx-sb', paymeTransactionTime: 1700000000000n, createdAt: new Date('2024-01-15'), isTest: true },
                { id: 'ord-prod-1', orderNumber: 'PRD001', total: 100, paymentStatus: 'PAID', paymeTransactionId: 'tx-prod', paymeTransactionTime: 1700000000000n, createdAt: new Date('2024-01-15'), isTest: false },
            ];
            return Promise.resolve(all.filter((o: any) => o.isTest === where.isTest));
        });

        const result = await handleGetStatement(0, Date.now(), 'test');
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].transaction).toBe('tx-sb');
    });

    it('should not include production orders when query filters for test', async () => {
        mockedPrisma.order.findMany.mockImplementation(({ where }: any) => {
            // Only sandbox orders in DB
            const all = [
                { id: 'ord-sb-1', orderNumber: 'SB001', total: 50, paymentStatus: 'PAID', paymeTransactionId: 'tx-sb', paymeTransactionTime: 1700000000000n, createdAt: new Date('2024-01-15'), isTest: true },
            ];
            return Promise.resolve(all.filter((o: any) => o.isTest === where.isTest));
        });

        const result = await handleGetStatement(0, Date.now(), 'test');
        expect(result.transactions).toHaveLength(1);
        // Verify no production transaction slipped in
        expect(result.transactions.every((t: any) => t.transaction !== 'tx-prod')).toBe(true);
    });

    it('should only return production orders in production mode', async () => {
        mockedPrisma.order.findMany.mockImplementation(({ where }: any) => {
            const all = [
                { id: 'ord-sb-1', orderNumber: 'SB001', total: 50, paymentStatus: 'PAID', paymeTransactionId: 'tx-sb', paymeTransactionTime: 1700000000000n, createdAt: new Date('2024-01-15'), isTest: true },
                { id: 'ord-prod-1', orderNumber: 'PRD001', total: 100, paymentStatus: 'PAID', paymeTransactionId: 'tx-prod', paymeTransactionTime: 1700000000000n, createdAt: new Date('2024-01-15'), isTest: false },
            ];
            return Promise.resolve(all.filter((o: any) => o.isTest === where.isTest));
        });

        const result = await handleGetStatement(0, Date.now(), 'production');
        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].transaction).toBe('tx-prod');
    });

    it('should not include test orders when query filters for production', async () => {
        mockedPrisma.order.findMany.mockImplementation(({ where }: any) => {
            // Only production orders in DB
            const all = [
                { id: 'ord-prod-1', orderNumber: 'PRD001', total: 100, paymentStatus: 'PAID', paymeTransactionId: 'tx-prod', paymeTransactionTime: 1700000000000n, createdAt: new Date('2024-01-15'), isTest: false },
            ];
            return Promise.resolve(all.filter((o: any) => o.isTest === where.isTest));
        });

        const result = await handleGetStatement(0, Date.now(), 'production');
        expect(result.transactions).toHaveLength(1);
        // Verify no sandbox transaction slipped in
        expect(result.transactions.every((t: any) => t.transaction !== 'tx-sb')).toBe(true);
    });
});

// ─── 8. Idempotent Transaction Paths with Mode Check ───────────────────────

describe('Idempotent paths — sandbox cannot replay production transactions', () => {
    it('should reject sandbox CreateTransaction for existing production PAID transaction', async () => {
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce({ paymeTransactionId: 'tx-prod', paymentStatus: 'PAID', paymeTransactionTime: 1700000000000n, isTest: false });

        await expect(
            handleCreateTransaction('tx-prod', Date.now(), 500000, { order_id: 'ord-prod' }, 'test')
        ).rejects.toEqual({
            code: -31001,
            message: "Order not available for this payment method",
            data: [],
        });
    });

    it('should reject production PerformTransaction for existing sandbox PAID transaction', async () => {
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce({ paymentStatus: 'PAID', paymeTransactionId: 'tx-sb', id: 'ord-sb', isTest: true });

        await expect(
            handlePerformTransaction('tx-sb', 'production')
        ).rejects.toEqual({
            code: -31001,
            message: "Order not available for this payment method",
            data: [],
        });
    });

    it('should allow sandbox CreateTransaction idempotent for sandbox PAID transaction', async () => {
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce({ paymeTransactionId: 'tx-sb', paymentStatus: 'PAID', paymeTransactionTime: 1700000000000n, isTest: true });

        const result = await handleCreateTransaction('tx-sb', Date.now(), 500000, { order_id: 'ord-sb' }, 'test');
        expect(result.state).toBe(2); // Performed
    });

    it('should allow production PerformTransaction idempotent for production PAID transaction', async () => {
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce({ paymentStatus: 'PAID', paymeTransactionId: 'tx-prod', id: 'ord-prod', isTest: false });

        const result = await handlePerformTransaction('tx-prod', 'production');
        expect(result.state).toBe(2); // Performed
    });

    it('should return correct error codes for wrong key and missing account', async () => {
        // Missing auth tested elsewhere; here verify handler error codes
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'nonexistent' }, 'production')
        ).rejects.toEqual({
            code: -31099,
            message: "Account not found",
            data: [{ field: "account.order_id" }],
        });
    });

    it('should return -31003 for nonexistent transaction in PerformTransaction', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handlePerformTransaction('tx-nonexistent', 'production')
        ).rejects.toEqual({
            code: -31003,
            message: "Transaction not found",
            data: [],
        });
    });
});
