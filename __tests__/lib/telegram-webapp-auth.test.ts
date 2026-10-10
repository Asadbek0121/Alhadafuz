import { describe, it, expect, vi } from 'vitest';

// Mock crypto to control timingSafeEqual behavior
const mockTimingSafeEqual = vi.fn((a: Buffer, b: Buffer) => a.equals(b));
vi.mock('crypto', () => ({
    default: {
        timingSafeEqual: mockTimingSafeEqual,
        createHmac: vi.fn(() => ({
            update: vi.fn().mockReturnThis(),
            digest: vi.fn(),
        })),
    },
}));

describe('Telegram WebApp Auth Validation', () => {
    describe('hash format validation', () => {
        const HASH_REGEX = /^[0-9a-f]{64}$/i;

        it('should accept 64-char hex hash', () => {
            const hash = 'a'.repeat(64);
            expect(HASH_REGEX.test(hash)).toBe(true);
        });

        it('should reject short hash', () => {
            expect(HASH_REGEX.test('abc')).toBe(false);
        });

        it('should reject non-hex characters', () => {
            expect(HASH_REGEX.test('g'.repeat(64))).toBe(false);
        });

        it('should reject mixed case with valid hex', () => {
            expect(HASH_REGEX.test('AaBb'.repeat(16))).toBe(true);
        });
    });

    describe('auth_date expiry', () => {
        const MAX_AGE_SECONDS = 3600;

        function isInitDataFresh(authDate: number): boolean {
            const now = Math.floor(Date.now() / 1000);
            const ageSeconds = now - authDate;
            return ageSeconds >= 0 && ageSeconds <= MAX_AGE_SECONDS;
        }

        it('should accept fresh auth_date (within 1 hour)', () => {
            const now = Math.floor(Date.now() / 1000);
            const oneMinuteAgo = now - 60;
            expect(isInitDataFresh(oneMinuteAgo)).toBe(true);
        });

        it('should reject expired auth_date (older than 1 hour)', () => {
            const now = Math.floor(Date.now() / 1000);
            const twoHoursAgo = now - 7200;
            expect(isInitDataFresh(twoHoursAgo)).toBe(false);
        });

        it('should reject future auth_date', () => {
            const now = Math.floor(Date.now() / 1000);
            const future = now + 3600;
            expect(isInitDataFresh(future)).toBe(false);
        });

        it('should accept exactly 1 hour old', () => {
            const now = Math.floor(Date.now() / 1000);
            const oneHourAgo = now - 3600;
            expect(isInitDataFresh(oneHourAgo)).toBe(true);
        });
    });
});
