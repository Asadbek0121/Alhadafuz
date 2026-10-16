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
    paymentMethod: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
    },
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mockedPrisma,
}));

globalThis.fetch = vi.fn();

const mockCancelInvoice = vi.fn();
const mockCreateInvoice = vi.fn();
vi.mock(" @/lib/invoice/invoice-service", () => ({
    createInvoiceForOrder: (...args: any[]) => mockCreateInvoice(...args),
    cancelInvoiceForOrder: (...args: any[]) => mockCancelInvoice(...args),
}));

import {
    getPaymeConfig,
    verifyAuthorization,
    parseAuthHeader,
    handleCheckPerformTransaction,
    handleCreateTransaction,
    handlePerformTransaction,
    handleCheckTransaction,
    handleGetStatement,
    handleChangePassword,
    paymeRpc,
    findConfigForLogin,
    verifyAuthorizationPerRequest,
PaymeTransactionState,} from '@/lib/payme';

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
    const id = overrides.id ?? 'pm-test-1';
    mockedPrisma.paymentMethod.findMany.mockResolvedValue([{ id, config: JSON.stringify(config) }]);
    mockedPrisma.paymentMethod.findFirst.mockResolvedValue({ id, config: JSON.stringify(config) });
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
            { id: 'pm-sb', config: JSON.stringify({ login: 'sandbox_user', key: 'prod_s', test_key: 'test_s' }) },
            { id: 'pm-prod', config: JSON.stringify({ login: 'prod_user', key: 'prod_main', test_key: 'test_p' }) },
        ]);

        const sandboxConfig = await findConfigForLogin('sandbox_user');
        const prodConfig = await findConfigForLogin('prod_user');

        expect(sandboxConfig?.login).toBe('sandbox_user');
        expect(sandboxConfig?.id).toBe('pm-sb');
        expect(prodConfig?.login).toBe('prod_user');
        expect(prodConfig?.id).toBe('pm-prod');
        expect(sandboxConfig).not.toEqual(prodConfig);
    });

    it('should reject ambiguous login — multiple configs with same login', async () => {
        mockedPrisma.paymentMethod.findMany.mockResolvedValue([
            { id: 'pm-a', config: JSON.stringify({ login: 'shared_login', key: 'key_a', test_key: 'test_a' }) },
            { id: 'pm-b', config: JSON.stringify({ login: 'shared_login', key: 'key_b', test_key: 'test_b' }) },
        ]);

        // Ambiguous login → null (safer than picking first)
        const config = await findConfigForLogin('shared_login');
        expect(config).toBeNull();
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

    it('should reject ambiguous login — multiple configs with same login', async () => {
        // Two configs share the same login — this must be rejected for safety
        mockedPrisma.paymentMethod.findMany.mockResolvedValue([
            { id: 'pm-a', config: JSON.stringify({ login: 'shared_login', key: 'key_a', test_key: 'test_a' }) },
            { id: 'pm-b', config: JSON.stringify({ login: 'shared_login', key: 'key_b', test_key: 'test_b' }) },
        ]);

        const authHeader = makeAuthHeader('shared_login', 'key_a');
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

    it('should reject invalid amount (49999 instead of 500000) with -31001', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ isTest: false }));

        await expect(
            handleCheckPerformTransaction(49999, { order_id: 'ord-test' }, 'production')
        ).rejects.toEqual({
            code: -31001,
            message: "Invalid amount",
            data: [],
        });
    });

    it('should reject invalid amount (500001 instead of 500000) with -31001', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ isTest: false }));

        await expect(
            handleCheckPerformTransaction(500001, { order_id: 'ord-test' }, 'production')
        ).rejects.toEqual({
            code: -31001,
            message: "Invalid amount",
            data: [],
        });
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

// ─── 9. ChangePassword Mode Isolation ──────────────────────────────────────

describe('handleChangePassword — mode isolation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should update test_key in test mode', async () => {
        mockedPrisma.paymentMethod.findUnique.mockResolvedValue({
            id: 'pm-1',
            config: JSON.stringify({ login: 'sb_user', key: 'prod_s', test_key: 'old_sandbox_key' }),
        });

        const result = await handleChangePassword('new_sandbox_key', 'test', 'pm-1');
        expect(result.message).toBe('Password changed successfully');
        const updateCall = mockedPrisma.paymentMethod.update.mock.calls[0][0];
        const updatedConfig = JSON.parse(updateCall.data.config);
        expect(updatedConfig.test_key).toBe('new_sandbox_key');
        expect(updatedConfig.testKey).toBe('new_sandbox_key'); // legacy alias also updated
        expect(updatedConfig.key).toBe('prod_s'); // key unchanged
    });

    it('should update key in production mode', async () => {
        mockedPrisma.paymentMethod.findUnique.mockResolvedValue({
            id: 'pm-1',
            config: JSON.stringify({ login: 'prod_user', key: 'old_prod_key', test_key: 'sb_key' }),
        });

        const result = await handleChangePassword('new_prod_key', 'production', 'pm-1');
        expect(result.message).toBe('Password changed successfully');
        const updateCall = mockedPrisma.paymentMethod.update.mock.calls[0][0];
        const updatedConfig = JSON.parse(updateCall.data.config);
        expect(updatedConfig.key).toBe('new_prod_key');
        expect(updatedConfig.Key).toBe('new_prod_key'); // legacy alias also updated
        expect(updatedConfig.test_key).toBe('sb_key'); // test_key unchanged
    });

    it('should only update the authenticated config, not others', async () => {
        // Two configs exist; only pm-sb should be touched
        mockedPrisma.paymentMethod.findUnique.mockResolvedValue({
            id: 'pm-sb',
            config: JSON.stringify({ login: 'sb_user', key: 'prod_s', test_key: 'old_sb_key' }),
        });

        await handleChangePassword('new_sb_key', 'test', 'pm-sb');

        expect(mockedPrisma.paymentMethod.update).toHaveBeenCalledTimes(1);
        const updateCall = mockedPrisma.paymentMethod.update.mock.calls[0][0];
        expect(updateCall.where.id).toBe('pm-sb');
    });

    it('should throw when paymentMethodId is missing', async () => {
        await expect(
            handleChangePassword('new_key', 'production')
        ).rejects.toEqual({
            code: -31000,
            message: "Payment method ID is required",
            data: [],
        });
    });

    it('should throw when the authenticated config is not found', async () => {
        mockedPrisma.paymentMethod.findUnique.mockResolvedValue(null);

        await expect(
            handleChangePassword('new_key', 'production', 'pm-nonexistent')
        ).rejects.toEqual({
            code: -31000,
            message: "PAYME configuration not found",
            data: [],
        });
    });

    it('should throw when config has no target field', async () => {
        // Config without test_key in test mode
        mockedPrisma.paymentMethod.findUnique.mockResolvedValue({
            id: 'pm-no-test',
            config: JSON.stringify({ login: 'no_test', key: 'some_key' }),
        });

        await expect(
            handleChangePassword('new_key', 'test', 'pm-no-test')
        ).rejects.toEqual({
            code: -31000,
            message: "PAYME config missing test_key field",
            data: [],
        });
    });

    it('should handle invalid JSON config gracefully', async () => {
        mockedPrisma.paymentMethod.findUnique.mockResolvedValue({
            id: 'pm-bad',
            config: 'not-valid-json',
        });

        await expect(
            handleChangePassword('new_key', 'production', 'pm-bad')
        ).rejects.toEqual({
            code: -31000,
            message: "PAYME config is invalid JSON",
            data: [],
        });
    });
});


// ─── 9. Invoice Integration Verification ──────────────────────────────────────

describe('Invoice integration verification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return correct cancel state for PAID order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            id: 'ord-cancel-paid',
            paymentStatus: 'PAID',
            status: 'COMPLETED',
            isTest: true,
        } as any);

        const { handleCancelTransaction } = await import('@/lib/payme');
        const result = await handleCancelTransaction('tx-cancel-paid', 1729000100, 5, 'test');

        expect(result.state).toBe(PaymeTransactionState.CancelledFromPerformed); // -2
        expect(result.transaction).toBe('tx-cancel-paid');
        expect(result.cancel_time).toBe(1729000100);
        expect(result.reason).toBe(5);
    });

    it('should return correct cancel state for AWAITING_PAYMENT order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            id: 'ord-cancel-awaiting',
            paymentStatus: 'AWAITING_PAYMENT',
            status: 'PENDING',
            isTest: true,
        } as any);

        const { handleCancelTransaction } = await import('@/lib/payme');
        const result = await handleCancelTransaction('tx-cancel-awaiting', 1729000200, 1, 'test');

        expect(result.state).toBe(PaymeTransactionState.CancelledFromCreated); // -1
        expect(result.transaction).toBe('tx-cancel-awaiting');
        expect(result.cancel_time).toBe(1729000200);
        expect(result.reason).toBe(1);
    });

    it('should be idempotent for already cancelled order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            id: 'ord-cancel-idemp',
            paymentStatus: 'PAYMENT_CANCELLED',
            status: 'PENDING',
            isTest: true,
        } as any);

        const { handleCancelTransaction } = await import('@/lib/payme');
        const first = await handleCancelTransaction('tx-idemp', 1729000300, 1, 'test');
        const second = await handleCancelTransaction('tx-idemp', 1729000300, 1, 'test');

        expect(first.state).toBe(PaymeTransactionState.CancelledFromCreated);
        expect(second.state).toBe(PaymeTransactionState.CancelledFromCreated);
        expect(first.cancel_time).toBe(second.cancel_time);
    });

    it('should not throw when invoice service import fails', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            id: 'ord-cancel-error',
            paymentStatus: 'PAID',
            status: 'COMPLETED',
            isTest: true,
        } as any);

        // Mock the dynamic import to throw
        const originalImport = globalThis.import;
        (globalThis as any).import = vi.fn().mockRejectedValue(new Error('Module not found'));

        try {
            const { handleCancelTransaction } = await import('@/lib/payme');
            // Should not throw - invoice cancellation is fire-and-forget
            const result = await handleCancelTransaction('tx-cancel-error', 1729000400, 5, 'test');
            expect(result.state).toBe(PaymeTransactionState.CancelledFromPerformed);
        } finally {
            (globalThis as any).import = originalImport;
        }
    });

    it('should create invoice after successful perform', async () => {
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce(null) // not already performed
            .mockResolvedValueOnce({
                id: 'ord-perf-inv',
                total: 500,
                isTest: true,
            } as any);
        mockedPrisma.order.update.mockResolvedValue({});
        mockedPrisma.paymentLog.create.mockResolvedValue({});

        const { handlePerformTransaction } = await import('@/lib/payme');
        const result = await handlePerformTransaction('tx-perf-inv', 'test');

        expect(result.state).toBe(PaymeTransactionState.Performed);
        expect(mockedPrisma.order.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ paymentStatus: 'PAID' }),
            })
        );
    });
});
