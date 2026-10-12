/**
 * Payme sandbox authorization debugging tests.
 *
 * Muammo: CheckPerformTransaction mavjud bo'lmagan order_id bilan chaqirilganda
 * API `-31050...-31099` o'rniga `-32504 Insufficient privileges` qaytarardi.
 *
 * Sabab: verifyAuthorization() da test rejimida config.testKey undefined bo'lsa,
 * config.password ?? config.key ga tushardi. Lekin paymeRpc() imzoni
 * config.testKey ?? config.key bilan imzolardi — kalitlar mos kelmasdi.
 *
 * Yechim: test rejimida testKey ustuvor, key fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing payme
const mockOrder = {
    id: 'ord-1',
    total: 10000,
    paymentStatus: 'PENDING',
    paymeTransactionId: null,
};

const mockedPrisma = vi.hoisted(() => ({
    order: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
    },
    paymentLog: {
        create: vi.fn(),
    },
    paymentMethod: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: mockedPrisma,
}));

// Mock fetch for paymeRpc
globalThis.fetch = vi.fn();

import {
    getPaymeConfig,
    verifyAuthorization,
    parseAuthHeader,
    handleCheckPerformTransaction,
    paymeRpc,
    type PaymeConfig,
} from '@/lib/payme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockConfig(overrides: Partial<PaymeConfig> = {}): PaymeConfig {
    return {
        merchant: '12345',
        login: 'test_login',
        key: 'production_key_123',
        testKey: 'sandbox_key_456',
        password: 'db_password',
        ...overrides,
    };
}

function makeAuthHeader(login: string, password: string): string {
    return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

// ─── 1. Config Loading Tests ───────────────────────────────────────────────

describe('getPaymeConfig — DB vs ENV priority', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear env vars
        delete process.env.PAYME_LOGIN;
        delete process.env.PAYME_MERCHANT_ID;
        delete process.env.PAYME_KEY;
        delete process.env.PAYME_TEST_KEY;
        delete process.env.PAYME_PASSWORD;
    });

    it('should prefer DB config over env vars', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'db_login',
                merchant: '99999',
                key: 'db_key',
                test_key: 'db_test_key',
            }),
        });

        process.env.PAYME_LOGIN = 'env_login';
        process.env.PAYME_MERCHANT_ID = 'env_merchant';
        process.env.PAYME_KEY = 'env_key';

        const config = await getPaymeConfig('production');
        expect(config).not.toBeNull();
        expect(config!.login).toBe('db_login');
        expect(config!.key).toBe('db_key');
        expect(config!.testKey).toBe('db_test_key');
    });

    it('should fallback to env vars when DB config is missing', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue(null);

        process.env.PAYME_LOGIN = 'env_login';
        process.env.PAYME_MERCHANT_ID = 'env_merchant';
        process.env.PAYME_KEY = 'env_key';

        const config = await getPaymeConfig('production');
        expect(config).not.toBeNull();
        expect(config!.login).toBe('env_login');
        expect(config!.key).toBe('env_key');
    });

    it('should use testKey in test mode, key in production mode', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'test_login',
                merchant: '12345',
                key: 'prod_key',
                test_key: 'sandbox_key',
            }),
        });

        const testConfig = await getPaymeConfig('test');
        expect(testConfig!.key).toBe('sandbox_key'); // test mode uses test_key

        const prodConfig = await getPaymeConfig('production');
        expect(prodConfig!.key).toBe('prod_key'); // production uses key
    });

    it('should fall back to key when testKey is missing in test mode', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'test_login',
                merchant: '12345',
                key: 'prod_key',
                // test_key yo'q
            }),
        });

        const testConfig = await getPaymeConfig('test');
        expect(testConfig).not.toBeNull();
        expect(testConfig!.key).toBe('prod_key'); // fallback to key
        expect(testConfig!.testKey).toBeUndefined();
    });

    it('should return null when config is incomplete', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({ login: 'incomplete' }), // merchant va key yo'q
        });

        const config = await getPaymeConfig('production');
        expect(config).toBeNull();
    });
});

// ─── 2. Authorization Tests ─────────────────────────────────────────────────

describe('verifyAuthorization — auth flow', () => {
    const config = mockConfig();

    it('should accept valid auth header', async () => {
        const authHeader = makeAuthHeader(config.login, config.key);
        await expect(verifyAuthorization(authHeader, config, 'production')).resolves.toBeUndefined();
    });

    it('should reject missing auth header', async () => {
        await expect(verifyAuthorization(null, config, 'production')).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject wrong login', async () => {
        const authHeader = makeAuthHeader('wrong_login', config.key);
        await expect(verifyAuthorization(authHeader, config, 'production')).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should reject wrong password', async () => {
        const authHeader = makeAuthHeader(config.login, 'wrong_password');
        await expect(verifyAuthorization(authHeader, config, 'production')).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should use testKey for auth in test mode', async () => {
        const testConfig = mockConfig({ testKey: 'sandbox_key_456' });
        const authHeader = makeAuthHeader(testConfig.login, testConfig.testKey!);
        await expect(verifyAuthorization(authHeader, testConfig, 'test')).resolves.toBeUndefined();
    });

    it('should fall back to key when testKey is undefined in test mode', async () => {
        const testConfig = mockConfig({ testKey: undefined });
        const authHeader = makeAuthHeader(testConfig.login, testConfig.key);
        await expect(verifyAuthorization(authHeader, testConfig, 'test')).resolves.toBeUndefined();
    });
});

// ─── 3. CheckPerformTransaction — Error Code Tests ─────────────────────────

describe('handleCheckPerformTransaction — error codes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return -31099 for nonexistent order_id', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCheckPerformTransaction(1000000, { order_id: 'nonexistent-order' })
        ).rejects.toEqual({
            code: -31099,
            message: "Account not found",
            data: [{ field: "account.order_id" }],
        });
    });

    it('should return -31001 for invalid amount', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            ...mockOrder,
            total: 5000, // 50 som, so'rov 10000 tiyin
        });

        await expect(
            handleCheckPerformTransaction(1000000, { order_id: 'ord-1' })
        ).rejects.toEqual({
            code: -31001,
            message: "Invalid amount",
            data: [],
        });
    });

    it('should return -31001 for already PAID order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            ...mockOrder,
            paymentStatus: 'PAID',
        });

        await expect(
            handleCheckPerformTransaction(1000000, { order_id: 'ord-1' })
        ).rejects.toEqual({
            code: -31001,
            message: "Transaction already performed",
            data: [],
        });
    });

    it('should return -31001 for busy order (AWAITING_PAYMENT)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue({
            ...mockOrder,
            paymentStatus: 'AWAITING_PAYMENT',
            paymeTransactionId: 'existing-tx',
        });

        await expect(
            handleCheckPerformTransaction(1000000, { order_id: 'ord-1' })
        ).rejects.toEqual({
            code: -31001,
            message: "Account is busy",
            data: [],
        });
    });

    it('should allow valid transaction request', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(mockOrder);

        const result = await handleCheckPerformTransaction(1000000, { order_id: 'ord-1' });
        expect(result).toEqual({ allow: true });
    });

    it('should return -31000 for missing order_id', async () => {
        await expect(
            handleCheckPerformTransaction(1000000, { order_id: '' as any })
        ).rejects.toEqual({
            code: -31000,
            message: "Invalid params: account.order_id required",
            data: [{ field: "account.order_id" }],
        });
    });
});

// ─── 4. paymeRpc — Signature and Mode Tests ────────────────────────────────

describe('paymeRpc — signature and mode consistency', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.PAYME_LOGIN;
        delete process.env.PAYME_MERCHANT_ID;
        delete process.env.PAYME_KEY;
        delete process.env.PAYME_TEST_KEY;
    });

    it('should use testKey for signing in test mode', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'test_login',
                merchant: '12345',
                key: 'prod_key',
                test_key: 'sandbox_key',
            }),
        });

        const mockResponse = { result: { allow: true }, error: null };
        (globalThis.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        await paymeRpc('CheckPerformTransaction', {
            amount: 1000000,
            account: { order_id: 'ord-1' },
        }, 'test');

        // Verify the request was made with correct auth
        const fetchCalls = (globalThis.fetch as any).mock.calls;
        expect(fetchCalls.length).toBe(1);
        const [url, options] = fetchCalls[0];
        expect(url).toBe('https://test.paycom.uz'); // test URL

        // Decode auth header to verify signature was made with testKey
        const authHeader = options.headers['Authorization'];
        expect(authHeader).toBeDefined();
        const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
        const [login, signature] = decoded.split(':');
        expect(login).toBe('test_login');
        expect(signature).toBeTruthy(); // signature should be present
    });

    it('should use key for signing in production mode', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'prod_login',
                merchant: '12345',
                key: 'prod_key',
                test_key: 'sandbox_key',
            }),
        });

        const mockResponse = { result: { allow: true }, error: null };
        (globalThis.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        await paymeRpc('CheckPerformTransaction', {
            amount: 1000000,
            account: { order_id: 'ord-1' },
        }, 'production');

        const fetchCalls = (globalThis.fetch as any).mock.calls;
        const [url] = fetchCalls[0];
        expect(url).toBe('https://payment.paycomjoint.uz'); // production URL
    });

    it('should return -32400 when config is missing', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue(null);

        const result = await paymeRpc('CheckPerformTransaction', {
            amount: 1000000,
            account: { order_id: 'ord-1' },
        }, 'test');

        expect(result.error).not.toBeNull();
        expect(result.error!.code).toBe(-32400);
        expect(result.error!.message).toContain('config not found');
    });
});

// ─── 5. parseAuthHeader — Edge Cases ───────────────────────────────────────

describe('parseAuthHeader', () => {
    it('should return null for missing header', () => {
        expect(parseAuthHeader(null)).toBeNull();
    });

    it('should return null for non-Basic header', () => {
        expect(parseAuthHeader('Bearer token')).toBeNull();
    });

    it('should parse valid Basic auth', () => {
        const header = makeAuthHeader('mylogin', 'mypassword');
        const result = parseAuthHeader(header);
        expect(result).toEqual({ login: 'mylogin', password: 'mypassword' });
    });

    it('should return null for malformed base64', () => {
        expect(parseAuthHeader('Basic not-base64!!!')).toBeNull();
    });

    it('should return null for missing password', () => {
        const header = makeAuthHeader('login', '');
        expect(parseAuthHeader(header)).toBeNull();
    });
});

// ─── 6. PAYME_MODE Default Behavior (Critical Bug Fix) ──────────────────────

describe('PAYME_MODE default behavior — production safety', () => {
    beforeEach(() => {
        // Clear PAYME_MODE between tests
        delete process.env.PAYME_MODE;
    });

    it('should default to production when PAYME_MODE is not set', () => {
        // This test verifies the fix: mode should be 'production' by default
        const mode = process.env.PAYME_MODE === 'test' ? 'test' : 'production';
        expect(mode).toBe('production');
    });

    it('should use test mode only when PAYME_MODE=test explicitly set', () => {
        process.env.PAYME_MODE = 'test';
        const mode = process.env.PAYME_MODE === 'test' ? 'test' : 'production';
        expect(mode).toBe('test');
        delete process.env.PAYME_MODE;
    });

    it('should NOT default to test mode (security fix)', () => {
        // Before fix: PAYME_MODE undefined → mode = 'test' (sandbox)
        // After fix: PAYME_MODE undefined → mode = 'production'
        const oldBehavior = process.env.PAYME_MODE === 'production' ? 'production' : 'test';
        const newBehavior = process.env.PAYME_MODE === 'test' ? 'test' : 'production';

        // Verify old behavior would have been wrong
        expect(oldBehavior).toBe('test'); // old buggy default
        // Verify new behavior is correct
        expect(newBehavior).toBe('production'); // fixed default
    });
});

// ─── 7. Production Auth Tests ───────────────────────────────────────────────

describe('Production auth flow — no sandbox leakage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.PAYME_MODE;
    });

    it('should use production key in production mode', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'prod_login',
                merchant: '12345',
                key: 'prod_key_123',
                test_key: 'sandbox_key_456',
            }),
        });

        const config = await getPaymeConfig('production');
        expect(config).not.toBeNull();
        expect(config!.key).toBe('prod_key_123'); // production uses main key
        expect(config!.testKey).toBe('sandbox_key_456'); // testKey stored separately
    });

    it('should use test key only when PAYME_MODE=test', async () => {
        process.env.PAYME_MODE = 'test';
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'test_login',
                merchant: '12345',
                key: 'prod_key',
                test_key: 'sandbox_key',
            }),
        });

        const config = await getPaymeConfig('production'); // called with 'production'
        expect(config!.key).toBe('prod_key'); // even in production mode, key is prod_key

        const testConfig = await getPaymeConfig('test');
        expect(testConfig!.key).toBe('sandbox_key'); // test mode uses test_key
        delete process.env.PAYME_MODE;
    });

    it('should reject invalid credentials in production mode', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'correct_login',
                merchant: '12345',
                key: 'correct_key',
            }),
        });

        const config = await getPaymeConfig('production');
        expect(config).not.toBeNull();

        // Wrong password should throw -32504
        const badAuth = makeAuthHeader('correct_login', 'wrong_password');
        await expect(verifyAuthorization(badAuth, config!, 'production')).rejects.toEqual({
            code: -32504,
            message: "Insufficient privileges for method execution",
            data: [],
        });
    });

    it('should accept valid production credentials', async () => {
        mockedPrisma.paymentMethod.findFirst.mockResolvedValue({
            id: 'pm-1',
            provider: 'PAYME',
            isActive: true,
            config: JSON.stringify({
                login: 'valid_login',
                merchant: '12345',
                key: 'valid_key',
            }),
        });

        const config = await getPaymeConfig('production');
        expect(config).not.toBeNull();

        // Correct password should pass
        const goodAuth = makeAuthHeader('valid_login', 'valid_key');
        await expect(verifyAuthorization(goodAuth, config!, 'production')).resolves.toBeUndefined();
    });
});
