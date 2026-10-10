import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Use vi.hoisted to define mocks that can be used in vi.mock factories
const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    userFindUnique: vi.fn(),
    userCreate: vi.fn(),
    userUpdate: vi.fn(),
    queryRawUnsafe: vi.fn(),
}));

// Mock NextAuth only — crypto remains real
vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

// Mock Prisma only
vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: mocks.userFindUnique,
            create: mocks.userCreate,
            update: mocks.userUpdate,
        },
        $queryRawUnsafe: mocks.queryRawUnsafe,
    },
}));

// Now import the module under test
import { HASH_REGEX, INIT_DATA_MAX_AGE_SECONDS, verifyTelegramInitData, parseInitDataPayload, isInitDataFresh } from '@/lib/telegram-webapp-auth';
import { getAuthenticatedCourier } from '@/lib/telegram-webapp-auth';

// Helper to compute valid Telegram WebApp initData hash using REAL crypto
function createValidInitData(telegramId: number, token: string, authDateOffsetSeconds = 0): string {
    const now = Math.floor(Date.now() / 1000) + authDateOffsetSeconds;
    const params = new URLSearchParams();
    params.set('user', JSON.stringify({ id: telegramId }));
    params.set('auth_date', String(now));

    // Sort params and create data check string (excluding hash)
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = sortedParams.map(([k, v]) => `${k}=${v}`).join('\n');

    // Compute secret key = SHA256(WebAppData, token)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();

    // Compute hash = HMAC-SHA256(secret_key, data_check_string)
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // Add hash to params
    params.set('hash', hash);

    return params.toString();
}

const TEST_TOKEN = 'test_courier_bot_token_46chars';
const VALID_HASH = 'a'.repeat(64);

beforeEach(() => {
    vi.clearAllMocks();
    process.env.COURIER_BOT_TOKEN = TEST_TOKEN;
    // Default userCreate returns COURIER (for approved app new-user flow)
    mocks.userCreate.mockResolvedValue({ id: 'user-new-001', role: 'COURIER' });
});

describe('verifyTelegramInitData', () => {
    it('should return true for valid signature', () => {
        const initData = createValidInitData(12345, TEST_TOKEN);
        expect(verifyTelegramInitData(initData, TEST_TOKEN)).toBe(true);
    });

    it('should return false for invalid signature', () => {
        const initData = createValidInitData(12345, TEST_TOKEN);
        expect(verifyTelegramInitData(initData, 'wrong_token')).toBe(false);
    });

    it('should return false for missing hash', () => {
        const initData = 'user=' + JSON.stringify({ id: 12345 }) + '&auth_date=' + Math.floor(Date.now() / 1000);
        expect(verifyTelegramInitData(initData, TEST_TOKEN)).toBe(false);
    });

    it('should return false for invalid hash format (not 64 hex chars)', () => {
        const initData = 'user=' + JSON.stringify({ id: 12345 }) + '&auth_date=123&hash=short';
        expect(verifyTelegramInitData(initData, TEST_TOKEN)).toBe(false);
    });

    it('should return false for empty initData', () => {
        expect(verifyTelegramInitData('', TEST_TOKEN)).toBe(false);
    });

    it('should return false for null initData', () => {
        expect(verifyTelegramInitData(null as any, TEST_TOKEN)).toBe(false);
    });

    it('should return false for empty token', () => {
        const initData = createValidInitData(12345, TEST_TOKEN);
        expect(verifyTelegramInitData(initData, '')).toBe(false);
    });

    it('should reject tampered initData', () => {
        const initData = createValidInitData(12345, TEST_TOKEN);
        const tampered = initData.replace('auth_date=', 'auth_dateX=');
        expect(verifyTelegramInitData(tampered, TEST_TOKEN)).toBe(false);
    });
});

describe('parseInitDataPayload', () => {
    it('should parse valid user data', () => {
        const initData = createValidInitData(12345, TEST_TOKEN);
        const payload = parseInitDataPayload(initData);
        expect(payload).not.toBeNull();
        expect(payload?.user.id).toBe('12345');
        expect(payload?.valid).toBe(true);
    });

    it('should return null for missing user', () => {
        const initData = 'auth_date=123&hash=' + VALID_HASH;
        expect(parseInitDataPayload(initData)).toBeNull();
    });

    it('should return null for invalid user JSON', () => {
        const initData = 'user=invalid_json&auth_date=123&hash=' + VALID_HASH;
        expect(parseInitDataPayload(initData)).toBeNull();
    });

    it('should return null for missing auth_date', () => {
        const initData = 'user=' + JSON.stringify({ id: 12345 });
        expect(parseInitDataPayload(initData)).toBeNull();
    });

    it('should return null for non-numeric auth_date', () => {
        const initData = 'user=' + JSON.stringify({ id: 12345 }) + '&auth_date=abc';
        expect(parseInitDataPayload(initData)).toBeNull();
    });

    it('should return null for negative auth_date', () => {
        const initData = 'user=' + JSON.stringify({ id: 12345 }) + '&auth_date=-100';
        expect(parseInitDataPayload(initData)).toBeNull();
    });
});

describe('isInitDataFresh', () => {
    it('should accept fresh auth_date (within 1 hour)', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(isInitDataFresh(now - 60)).toBe(true);
    });

    it('should accept auth_date exactly at boundary (1 hour)', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(isInitDataFresh(now - INIT_DATA_MAX_AGE_SECONDS)).toBe(true);
    });

    it('should reject expired auth_date (older than 1 hour)', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(isInitDataFresh(now - 7200)).toBe(false);
    });

    it('should reject future auth_date', () => {
        const now = Math.floor(Date.now() / 1000);
        expect(isInitDataFresh(now + 3600)).toBe(false);
    });

    it('should reject zero auth_date', () => {
        expect(isInitDataFresh(0)).toBe(false);
    });

    it('should reject negative auth_date', () => {
        expect(isInitDataFresh(-100)).toBe(false);
    });
});

describe('HASH_REGEX', () => {
    it('should accept 64-char lowercase hex', () => {
        expect(HASH_REGEX.test('a'.repeat(64))).toBe(true);
    });

    it('should accept 64-char uppercase hex', () => {
        expect(HASH_REGEX.test('A'.repeat(64))).toBe(true);
    });

    it('should accept 64-char mixed case hex', () => {
        expect(HASH_REGEX.test('AaBb'.repeat(16))).toBe(true);
    });

    it('should reject short hash', () => {
        expect(HASH_REGEX.test('abc')).toBe(false);
    });

    it('should reject long hash', () => {
        expect(HASH_REGEX.test('a'.repeat(65))).toBe(false);
    });

    it('should reject non-hex characters', () => {
        expect(HASH_REGEX.test('g'.repeat(64))).toBe(false);
    });

    it('should reject special characters', () => {
        expect(HASH_REGEX.test('!@#$%^&*()'.repeat(6))).toBe(false);
    });

    it('should reject empty string', () => {
        expect(HASH_REGEX.test('')).toBe(false);
    });
});

describe('INIT_DATA_MAX_AGE_SECONDS', () => {
    it('should be 3600 (1 hour)', () => {
        expect(INIT_DATA_MAX_AGE_SECONDS).toBe(3600);
    });
});

describe('getAuthenticatedCourier', () => {
    const makeRequest = (initData?: string) => {
        const headers = new Headers();
        if (initData) headers.set('x-telegram-init-data', initData);
        return new Request('http://localhost/api/test', { headers });
    };

    it('should return null when no initData header provided', async () => {
        const result = await getAuthenticatedCourier(makeRequest());
        expect(result).toBeNull();
    });

    it('should return null when COURIER_BOT_TOKEN is not configured', async () => {
        delete process.env.COURIER_BOT_TOKEN;
        const result = await getAuthenticatedCourier(makeRequest('test'));
        expect(result).toBeNull();
    });

    it('should return null when signature is invalid', async () => {
        const initData = createValidInitData(12345, TEST_TOKEN);
        const spy = vi.spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);
        const result = await getAuthenticatedCourier(makeRequest(initData));
        expect(result).toBeNull();
        spy.mockRestore();
    });

    it('should return null when auth_date is expired', async () => {
        const initData = createValidInitData(12345, TEST_TOKEN, -7200);
        const result = await getAuthenticatedCourier(makeRequest(initData));
        expect(result).toBeNull();
    });

    it('should grant COURIER role for APPROVED application (new user)', async () => {
        mocks.userFindUnique.mockResolvedValue(null);
        mocks.queryRawUnsafe.mockResolvedValue([{ status: 'APPROVED', name: 'Ali', phone: '+998901234567' }]);
        // Override: new user created with COURIER role
        mocks.userCreate.mockResolvedValue({ id: 'user-new', role: 'COURIER' });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        expect(result).not.toBeNull();
        expect(result?.role).toBe('COURIER');
        expect(mocks.userCreate).toHaveBeenCalledTimes(1);
        const createCall = mocks.userCreate.mock.calls[0][0];
        expect(createCall.data.role).toBe('COURIER');
    });

    it('should create USER role for PENDING application then deny access', async () => {
        mocks.userFindUnique.mockResolvedValue(null);
        mocks.queryRawUnsafe.mockResolvedValue([{ status: 'PENDING', name: 'Ali', phone: '+998901234567' }]);
        // Override: new user created with USER role (no approved app)
        mocks.userCreate.mockResolvedValue({ id: 'user-new', role: 'USER' });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        // getAuthenticatedCourier only allows COURIER/ADMIN — USER is denied
        expect(result).toBeNull();
        expect(mocks.userCreate).toHaveBeenCalledTimes(1);
        const createCall = mocks.userCreate.mock.calls[0][0];
        expect(createCall.data.role).toBe('USER');
    });

    it('should create USER role for REJECTED application then deny access', async () => {
        mocks.userFindUnique.mockResolvedValue(null);
        mocks.queryRawUnsafe.mockResolvedValue([{ status: 'REJECTED', name: 'Ali', phone: '+998901234567' }]);
        mocks.userCreate.mockResolvedValue({ id: 'user-new', role: 'USER' });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        // USER role is denied
        expect(result).toBeNull();
        expect(mocks.userCreate).toHaveBeenCalledTimes(1);
        const createCall = mocks.userCreate.mock.calls[0][0];
        expect(createCall.data.role).toBe('USER');
    });

    it('should upgrade existing USER to COURIER for APPROVED application', async () => {
        mocks.userFindUnique.mockResolvedValue({ id: 'user-123', role: 'USER', name: 'Ali', phone: null });
        mocks.queryRawUnsafe.mockResolvedValue([{ status: 'APPROVED', name: 'Ali', phone: '+998901234567' }]);
        mocks.userUpdate.mockResolvedValue({});

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        expect(result).not.toBeNull();
        expect(result?.role).toBe('COURIER');
        expect(mocks.userUpdate).toHaveBeenCalledTimes(1);
        const updateCall = mocks.userUpdate.mock.calls[0][0];
        expect(updateCall.data.role).toBe('COURIER');
    });

    it('should return null for existing USER with no application (access denied)', async () => {
        mocks.userFindUnique.mockResolvedValue({ id: 'user-123', role: 'USER', name: 'Ali', phone: null });
        mocks.queryRawUnsafe.mockResolvedValue([]);

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        // USER role is denied — getAuthenticatedCourier only allows COURIER/ADMIN
        expect(result).toBeNull();
    });

    it('should return existing COURIER user directly', async () => {
        mocks.userFindUnique.mockResolvedValue({ id: 'user-123', role: 'COURIER', name: 'Ali', phone: '+998901234567' });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        expect(result).not.toBeNull();
        expect(result?.role).toBe('COURIER');
        expect(mocks.userCreate).not.toHaveBeenCalled();
        expect(mocks.userUpdate).not.toHaveBeenCalled();
    });

    it('should return existing ADMIN user directly', async () => {
        mocks.userFindUnique.mockResolvedValue({ id: 'user-admin', role: 'ADMIN', name: 'Admin', phone: null });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        expect(result).not.toBeNull();
        expect(result?.role).toBe('ADMIN');
        expect(mocks.userCreate).not.toHaveBeenCalled();
        expect(mocks.userUpdate).not.toHaveBeenCalled();
    });

    it('should handle queryRawUnsafe error gracefully (no app found → USER created → access denied)', async () => {
        mocks.userFindUnique.mockResolvedValue(null);
        mocks.queryRawUnsafe.mockRejectedValue(new Error('DB error'));
        // Override: USER role created when app query fails
        mocks.userCreate.mockResolvedValue({ id: 'user-new', role: 'USER' });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        // App query fails → no app → USER created → USER denied
        expect(result).toBeNull();
        expect(mocks.userCreate).toHaveBeenCalledTimes(1);
    });

    it('should use NextAuth session when available (COURIER role)', async () => {
        mocks.auth.mockResolvedValue({
            user: { id: 'sess-user-1', role: 'COURIER', name: 'Session User' },
        });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        // NextAuth session takes priority — should return session user, not process telegram auth
        expect(result).not.toBeNull();
        expect(result?.role).toBe('COURIER');
        expect(result?.id).toBe('sess-user-1');
        // Should not call prisma since session already has COURIER role
        expect(mocks.userFindUnique).not.toHaveBeenCalled();
    });

    it('should fall through to Telegram auth when NextAuth session is USER role', async () => {
        mocks.auth.mockResolvedValue({
            user: { id: 'sess-user-2', role: 'USER', name: 'Session User' },
        });
        mocks.userFindUnique.mockResolvedValue({ id: 'user-456', role: 'COURIER', name: 'Ali', phone: '+998901234567' });

        const initData = createValidInitData(12345, TEST_TOKEN);
        const result = await getAuthenticatedCourier(makeRequest(initData));

        // Session is USER, so falls through to Telegram auth
        // Telegram auth finds existing COURIER user → returns COURIER
        expect(result).not.toBeNull();
        expect(result?.role).toBe('COURIER');
    });
});
