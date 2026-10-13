/**
 * PaymentLog enhanced fields integration test.
 *
 * Verifies that:
 * 1. PaymentLog creation in payme.ts includes orderId and method
 * 2. PaymentLog creation in click/route.ts includes orderId and method
 * 3. Invoice table is queried correctly in /admin/invoices page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mock setup ──────────────────────────────────────────────────────────────

const mockOrder = {
    id: 'ord-test',
    total: 5000,
    paymentStatus: 'PENDING',
    paymeTransactionId: null,
    isTest: false,
    status: 'CREATED',
    orderNumber: 'ORD001',
};

const mockedPrisma = vi.hoisted(() => ({
    order: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
    },
    paymentLog: { create: vi.fn() },
    invoice: {
        findMany: vi.fn(),
        count: vi.fn(),
    },
    paymentMethod: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
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
} from '@/lib/payme';

// ─── PaymentLog Enhancement Tests ────────────────────────────────────────────

describe('PaymentLog enhancement — orderId and method fields', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete process.env.PAYME_MODE;
    });

    it('should include orderId and method in CreateTransaction PaymentLog', async () => {
        // Mock the order lookup - return order with matching amount (5000 * 100 = 500000 tiyin)
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce(null)  // First check: no existing transaction
            .mockResolvedValueOnce({     // Second check: find order
                id: 'ord-test',
                total: 5000,
                paymentStatus: 'PENDING',
                isTest: false,
                paymeTransactionId: null,
            });
        
        // Mock order.update to prevent actual DB update
        mockedPrisma.order.update.mockResolvedValue({});

        await handleCreateTransaction('tx-1', Date.now(), 500000, { order_id: 'ord-test' }, 'production');

        // Check that paymentLog.create was called with orderId and method
        const createCalls = mockedPrisma.paymentLog.create.mock.calls;
        expect(createCalls.length).toBeGreaterThan(0);

        const lastCall = createCalls[createCalls.length - 1];
        const data = lastCall[0].data;
        expect(data.orderId).toBe('ord-test');
        expect(data.method).toBe('CreateTransaction');
        expect(data.provider).toBe('PAYME');
        expect(data.status).toBe('REQUEST_RECEIVED');
    });

    it('should include orderId and method in PerformTransaction PaymentLog', async () => {
        // Mock the transaction lookup
        mockedPrisma.order.findFirst
            .mockResolvedValueOnce(null)  // First check (idempotent)
            .mockResolvedValueOnce({     // Second check (order lookup)
                ...mockOrder,
                paymeTransactionId: 'tx-1',
                paymentStatus: 'PENDING',
            });

        mockedPrisma.order.update.mockResolvedValue({});

        await handlePerformTransaction('tx-1', 'production');

        // Check that paymentLog.create was called with orderId and method
        const createCalls = mockedPrisma.paymentLog.create.mock.calls;
        expect(createCalls.length).toBeGreaterThan(0);

        const lastCall = createCalls[createCalls.length - 1];
        const data = lastCall[0].data;
        expect(data.orderId).toBe('ord-test');
        expect(data.method).toBe('PerformTransaction');
        expect(data.status).toBe('SUCCESS');
    });
});

// ─── Source Code Verification ────────────────────────────────────────────────

describe('Source code verification — PaymentLog enhancements', () => {
    const paymePath = path.resolve(process.cwd(), 'src/lib/payme.ts');
    const clickRoutePath = path.resolve(process.cwd(), 'src/app/api/payment/click/route.ts');
    const paymeContent = fs.readFileSync(paymePath, 'utf-8');
    const clickContent = fs.readFileSync(clickRoutePath, 'utf-8');

    it('payme.ts must include orderId in PaymentLog create calls', () => {
        // Check that PaymentLog creation includes orderId
        expect(paymeContent).toMatch(/paymentLog\.create\([^)]*orderId/);
    });

    it('payme.ts must include method in PaymentLog create calls', () => {
        // Check that PaymentLog creation includes method
        expect(paymeContent).toMatch(/paymentLog\.create\([^)]*method/);
    });

    it('click/route.ts must include orderId in PaymentLog create calls', () => {
        // Check that PaymentLog creation includes orderId
        expect(clickContent).toMatch(/paymentLog\.create\([^)]*orderId/);
    });

    it('click/route.ts must include method in PaymentLog create calls', () => {
        // Check that PaymentLog creation includes method
        expect(clickContent).toMatch(/paymentLog\.create\([^)]*method/);
    });
});

// ─── Invoice Page Verification ───────────────────────────────────────────────

describe('Invoice page — queries Invoice table correctly', () => {
    const invoicesPagePath = path.resolve(
        process.cwd(),
        'src/app/(admin)/admin/invoices/page.tsx'
    );
    const content = fs.readFileSync(invoicesPagePath, 'utf-8');

    it('must query prisma.invoice instead of prisma.order for admin view', () => {
        // Admin section should use Invoice queries
        expect(content).toContain('prisma.invoice.count');
        expect(content).toContain('prisma.invoice.findMany');
        // Should NOT use Order queries in admin section
        expect(content).not.toContain('prisma.order.count');
        expect(content).not.toContain('prisma.order.findMany');
    });

    it('must include invoiceType filter support', () => {
        expect(content).toContain('invoiceType');
    });

    it('must show invoiceNumber in table display', () => {
        expect(content).toContain('invoiceNumber');
    });
});

// ─── Schema Verification ─────────────────────────────────────────────────────

describe('Schema — PaymentLog has new fields', () => {
    const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    it('must have orderId field in PaymentLog model', () => {
        expect(content).toMatch(/model PaymentLog[\s\S]*?orderId\s+String\?/);
    });

    it('must have method field in PaymentLog model', () => {
        expect(content).toMatch(/model PaymentLog[\s\S]*?method\s+String\?/);
    });

    it('must have errorCode field in PaymentLog model', () => {
        expect(content).toMatch(/model PaymentLog[\s\S]*?errorCode\s+String\?/);
    });
});
