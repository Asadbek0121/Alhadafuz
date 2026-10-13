/**
 * Payme P2022 defensive handling tests.
 *
 * Verifies that when the database is missing `isTest`, `paymeTransactionId`,
 * or `paymeTransactionTime` columns, handlers return correct JSON-RPC error
 * codes instead of propagating Prisma P2022 to the caller.
 *
 * Scenarios:
 *   - "Invalid amount" test → -31001 (not P2022)
 *   - "Nonexistent account" test → -31099 (not P2022)
 *   - CheckTransaction with missing columns → -31099
 *   - PerformTransaction with missing columns → -31003
 *   - GetStatement with missing columns → empty transactions (no error)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mockOrder = {
    id: 'ord-test',
    total: 5000,
    paymentStatus: 'PENDING',
    paymeTransactionId: null,
    isTest: false,
    status: 'CREATED',
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

import {
    handleCheckPerformTransaction,
    handleCreateTransaction,
    handlePerformTransaction,
    handleCheckTransaction,
    handleGetStatement,
} from '@/lib/payme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simulate Prisma throwing P2022 (column does not exist) */
function p2022Error(): Error {
    const e = new Error('column "isTest" of relation "Order" does not exist');
    (e as any).code = 'P2022';
    return e as any;
}

/** Simulate Prisma throwing P2022 for paymeTransactionId */
function p2022TransactionError(): Error {
    const e = new Error('column "paymeTransactionId" of relation "Order" does not exist');
    (e as any).code = 'P2022';
    return e as any;
}

/** Mavjud order mock */
function buildMockOrder(overrides: Record<string, any> = {}) {
    return { ...mockOrder, ...overrides };
}

beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PAYME_MODE;
});

// ─── CheckPerformTransaction — P2022 guard ──────────────────────────────────

describe('handleCheckPerformTransaction — P2022 column-missing guard', () => {
    it('returns -31099 when isTest column is missing (P2022)', async () => {
        // Simulate missing isTest column
        mockedPrisma.order.findFirst.mockRejectedValue(p2022Error());

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'ORD-999' }, 'test')
        ).rejects.toMatchObject({ code: -31099 });
    });

    it('returns -31099 for nonexistent order (normal path)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'NONEXISTENT' }, 'production')
        ).rejects.toMatchObject({ code: -31099 });
    });

    it('returns -31001 for wrong amount (normal path)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ total: 100 }));

        // Amount 500000 tiyin ≠ 100 * 100 = 10000 tiyin
        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'ord-test' }, 'production')
        ).rejects.toMatchObject({ code: -31001 });
    });

    it('returns -31001 for cross-mode order', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(buildMockOrder({ isTest: true }));

        await expect(
            handleCheckPerformTransaction(500000, { order_id: 'ord-sandbox' }, 'production')
        ).rejects.toMatchObject({ code: -31001 });
    });
});

// ─── CreateTransaction — P2022 guard ─────────────────────────────────────────

describe('handleCreateTransaction — P2022 column-missing guard', () => {
    it('returns -31099 when isTest column is missing (P2022 on order lookup)', async () => {
        // First query (idempotent check by paymeTransactionId) also fails
        mockedPrisma.order.findFirst
            .mockRejectedValueOnce(p2022Error())   // existing check
            .mockRejectedValueOnce(p2022Error());   // order lookup

        await expect(
            handleCreateTransaction('tx-1', Date.now(), 500000, { order_id: 'ORD-999' }, 'test')
        ).rejects.toMatchObject({ code: -31099 });
    });

    it('returns -31099 for nonexistent order (normal path)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCreateTransaction('tx-1', Date.now(), 500000, { order_id: 'NONEXISTENT' }, 'production')
        ).rejects.toMatchObject({ code: -31099 });
    });

    it('returns -31001 for wrong amount (normal path)', async () => {
        // First call (idempotent check by tx ID) → null, second call (order lookup) → order
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce(null)   // no existing transaction
            .mockResolvedValue(buildMockOrder({ total: 999 }));  // order with wrong amount

        await expect(
            handleCreateTransaction('tx-1', Date.now(), 500000, { order_id: 'ord-test' }, 'production')
        ).rejects.toMatchObject({ code: -31001 });
    });
});

// ─── PerformTransaction — P2022 guard ────────────────────────────────────────

describe('handlePerformTransaction — P2022 column-missing guard', () => {
    it('returns -31003 when paymeTransactionId column is missing (P2022)', async () => {
        // Both queries (existing check + order lookup) fail with P2022
        mockedPrisma.order.findFirst
            .mockRejectedValueOnce(p2022TransactionError())  // existing check
            .mockRejectedValueOnce(p2022TransactionError()); // order lookup

        await expect(
            handlePerformTransaction('tx-nonexistent', 'test')
        ).rejects.toMatchObject({ code: -31003 });
    });

    it('returns -31003 for nonexistent transaction (normal path)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handlePerformTransaction('tx-missing', 'production')
        ).rejects.toMatchObject({ code: -31003 });
    });
});

// ─── CheckTransaction — P2022 guard ──────────────────────────────────────────

describe('handleCheckTransaction — P2022 column-missing guard', () => {
    it('returns -31099 when paymeTransactionId column is missing (P2022)', async () => {
        mockedPrisma.order.findFirst.mockRejectedValue(p2022TransactionError());

        await expect(
            handleCheckTransaction('tx-missing', 'test')
        ).rejects.toMatchObject({ code: -31099 });
    });

    it('returns -31099 for nonexistent transaction (normal path)', async () => {
        mockedPrisma.order.findFirst.mockResolvedValue(null);

        await expect(
            handleCheckTransaction('tx-missing', 'production')
        ).rejects.toMatchObject({ code: -31099 });
    });
});

// ─── GetStatement — P2022 guard ──────────────────────────────────────────────

describe('handleGetStatement — P2022 column-missing guard', () => {
    it('returns empty transactions when paymeTransactionId/isTest columns are missing', async () => {
        mockedPrisma.order.findMany.mockRejectedValue(p2022Error());

        const result = await handleGetStatement(
            Date.now() - 86400000, // from: 1 day ago
            Date.now(),            // to: now
            'test'
        );

        expect(result.transactions).toEqual([]);
    });

    it('returns transactions when columns exist (normal path)', async () => {
        const mockTx = {
            id: 'ord-1',
            orderNumber: 'ORD001',
            total: 5000,
            paymentStatus: 'PAID',
            paymeTransactionId: 'tx-1',
            paymeTransactionTime: BigInt(1700000000000),
            createdAt: new Date('2024-01-15'),
            isTest: true,
        };
        mockedPrisma.order.findMany.mockResolvedValue([mockTx]);

        const result = await handleGetStatement(
            Date.now() - 86400000,
            Date.now(),
            'test'
        );

        expect(result.transactions).toHaveLength(1);
        expect(result.transactions[0].transaction).toBe('tx-1');
        expect(result.transactions[0].state).toBe(2); // Performed
    });
});

// ─── Source-level tests ──────────────────────────────────────────────────────

describe('P2022 guards — source code verification', () => {
    const paymePath = require('path').resolve(process.cwd(), 'src/lib/payme.ts');
    const content = require('fs').readFileSync(paymePath, 'utf-8');

    it('must define safeOrderQuery helper', () => {
        expect(content).toContain('async function safeOrderQuery');
        expect(content).toContain('P2022');
    });

    it('must wrap handleCheckPerformTransaction order lookup in safeOrderQuery', () => {
        // The handler should use safeOrderQuery for the main order lookup
        expect(content).toContain('safeOrderQuery');
        // Must have P2022 check inside the helper
        expect(content).toContain('e?.code === "P2022"');
    });

    it('must wrap handleCreateTransaction order lookup in safeOrderQuery', () => {
        expect(content).toMatch(/safeOrderQuery\(async \(\) =>[\s\S]*?prisma\.order\.findFirst/);
    });
});
