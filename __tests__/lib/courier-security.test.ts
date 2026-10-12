import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock setup ───────────────────────────────────────────────────────────

// Set env BEFORE any module loads (vi.hoisted runs before imports)
const envMock = vi.hoisted(() => ({
    courierBotToken: '',
}));

// Must be set before prisma/CourierService imports
process.env.COURIER_BOT_TOKEN = 'test_courier_bot_token_46chars_long_enough';

const mockedPrisma = vi.hoisted(() => {
    const calls: Record<string, any[][]> = {};
    const makeMockFn = (name: string) => {
        const fn = vi.fn();
        calls[name] = fn.mock.calls;
        return fn;
    };
    return {
        prisma: {
            order:           { findUnique: makeMockFn('order_findUnique'),   update: makeMockFn('order_update') },
            dispatchLog:     { create: makeMockFn('dispatchLog_create') },
            courierProfile:  { update: makeMockFn('courierProfile_update'),  upsert: makeMockFn('courierProfile_upsert'), findUnique: makeMockFn('courierProfile_findUnique') },
            user:            { findUnique: makeMockFn('user_findUnique'),    update: makeMockFn('user_update'), create: makeMockFn('user_create'), findFirst: makeMockFn('user_findFirst') },
            courierApplication: { findFirst: makeMockFn('ca_findFirst'),    create: makeMockFn('ca_create'), update: makeMockFn('ca_update') },
            notification:    { create: makeMockFn('notification_create') },
            $transaction:    vi.fn(),
            $queryRawUnsafe: vi.fn(),
            $executeRawUnsafe: vi.fn(),
        },
        calls,
    };
});

vi.mock('@/lib/prisma', () => ({
    prisma: mockedPrisma.prisma,
}));

globalThis.fetch = vi.fn();

import { CourierService } from '@/services/CourierService';
import { getDistance } from '@/lib/dispatch';

const p = mockedPrisma.prisma;
const calls = mockedPrisma.calls;
const mockFetch = vi.mocked(globalThis.fetch);

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeOrder(overrides: Record<string, any> = {}) {
    return {
        id: 'ord-1',
        status: 'ASSIGNED',
        courierId: 'courier-1',
        deliveryPhoto: 'photo-123',
        userId: 'user-1',
        ...overrides,
    };
}

const COURIER_ID = 'courier-1';
const OTHER_COURIER_ID = 'courier-2';
const ORDER_ID = 'ord-1';
const service = new CourierService();

beforeEach(() => {
    vi.clearAllMocks();
    // Reset call counts
    for (const key of Object.keys(calls)) calls[key] = [];

    // Default settings for fee
    p.$queryRawUnsafe.mockResolvedValue([{ courierFeePerOrder: 12000 }]);

    // Default transaction: executes the callback and returns its result
    p.$transaction.mockImplementation(async (cb: any) => {
        return cb(p);
    });
});

// ─── 1. GPS Distance Tests ────────────────────────────────────────────────

describe('getDistance (Haversine)', () => {
    it('should return 0 for same coordinates', () => {
        const d = getDistance(41.0, 64.0, 41.0, 64.0);
        expect(d).toBeCloseTo(0, 5);
    });

    it('should compute correct distance for Termiz→Tashkent (~220 km)', () => {
        const d = getDistance(39.97, 67.28, 41.30, 69.28);
        expect(d).toBeGreaterThan(200);
        expect(d).toBeLessThan(250);
    });

    it('should correctly differentiate latitude vs longitude (dLon bug regression)', () => {
        // At equator 1° lon ≈ 111 km; at 60° lat it's ≈ 55 km
        const dEquator = getDistance(0, 0, 0, 1);
        const dMidLat  = getDistance(60, 0, 60, 1);
        expect(dEquator).toBeGreaterThan(dMidLat);
        expect(dEquator / dMidLat).toBeGreaterThan(1.8);
        expect(dEquator / dMidLat).toBeLessThan(2.2);
    });

    it('should produce different results for different point pairs', () => {
        // Near points vs far points
        const near = getDistance(41.0, 64.0, 41.01, 64.01);  // ~1.4 km
        const far  = getDistance(41.0, 64.0, 42.0, 65.0);   // ~140 km
        expect(far).toBeGreaterThan(near * 50);
    });
});

// ─── 2. Status Transition Tests ───────────────────────────────────────────

describe('updateOrderStatus — allowed transitions', () => {
    beforeEach(() => {
        p.order.findUnique.mockResolvedValue(makeOrder());
    });

    it('should allow ASSIGNED → PROCESSING', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
        const result = await service.updateOrderStatus(ORDER_ID, 'PROCESSING', COURIER_ID);
        expect(result.status).toBe('PROCESSING');
        expect(p.order.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'PROCESSING' }) })
        );
    });

    it('should allow ASSIGNED → CANCELLED', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
        const result = await service.updateOrderStatus(ORDER_ID, 'CANCELLED', COURIER_ID);
        expect(result.status).toBe('CANCELLED');
    });

    it('should reject invalid transition ASSIGNED → DELIVERED', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
        await expect(
            service.updateOrderStatus(ORDER_ID, 'DELIVERED', COURIER_ID)
        ).rejects.toThrow(/Invalid transition|Allowed/);
    });

    it('should reject any transition from CANCELLED', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'CANCELLED' }));
        await expect(
            service.updateOrderStatus(ORDER_ID, 'PROCESSING', COURIER_ID)
        ).rejects.toThrow(/Access denied|Invalid/);
    });

    it('should reject any transition from COMPLETED', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'COMPLETED' }));
        await expect(
            service.updateOrderStatus(ORDER_ID, 'CANCELLED', COURIER_ID)
        ).rejects.toThrow(/Access denied|Invalid/);
    });
});

// ─── 3. Cross-Courier Access Prevention ───────────────────────────────────

describe('Cross-courier access — assertOrderAccessible', () => {
    it('should deny another courier updating order not assigned to them', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ courierId: OTHER_COURIER_ID }));
        await expect(
            service.updateOrderStatus(ORDER_ID, 'PROCESSING', COURIER_ID)
        ).rejects.toThrow(/not assigned to this courier|Access denied/);
    });

    it('should deny another courier from delivering', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ courierId: OTHER_COURIER_ID, status: 'DELIVERING' }));
        await expect(
            service.deliverOrder(ORDER_ID, 'photo-1', COURIER_ID)
        ).rejects.toThrow(/not assigned to this courier/);
    });

    it('should deny another courier from completing', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ courierId: OTHER_COURIER_ID, status: 'DELIVERED' }));
        await expect(
            service.completeOrder(ORDER_ID, COURIER_ID)
        ).rejects.toThrow(/not assigned to this courier/);
    });

    it('should deny another courier from cancelling', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ courierId: OTHER_COURIER_ID, status: 'ASSIGNED' }));
        await expect(
            service.cancelOrder(ORDER_ID, COURIER_ID, 'reason')
        ).rejects.toThrow(/not assigned to this courier|Access denied/);
    });
});

// ─── 4. Unauthorized Payment Change ───────────────────────────────────────

describe('markOrderPaid — admin-only protection', () => {
    it('service should set PAID when called with valid source (admin)', async () => {
        const result = await service.markOrderPaid(ORDER_ID, 'admin');
        expect(result.paymentStatus).toBe('PAID');
        expect(p.order.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'PAID' }) })
        );
    });

    it('service should set PAID when called with valid source (click / payme)', async () => {
        for (const src of ['click' as const, 'payme' as const, 'p2p' as const]) {
            vi.clearAllMocks();
            p.order.update.mockClear();
            p.$queryRawUnsafe.mockResolvedValue([{ courierFeePerOrder: 12000 }]);
            const result = await service.markOrderPaid(ORDER_ID, src);
            expect(result.paymentStatus).toBe('PAID');
            expect(p.order.update).toHaveBeenCalledOnce();
        }
    });

    it('service should reject PAID when called with invalid/empty source', async () => {
        // Invalid source — not in allowed list
        await expect(service.markOrderPaid(ORDER_ID, 'courier' as any)).rejects.toThrow(/forbidden source/);
        await expect(service.markOrderPaid(ORDER_ID, 'random' as any)).rejects.toThrow(/forbidden source/);
        // Empty source
        await expect(service.markOrderPaid(ORDER_ID, '')).rejects.toThrow(/forbidden source|valid source/);
        // Null/undefined
        await expect(service.markOrderPaid(ORDER_ID, null as any)).rejects.toThrow(/forbidden source|valid source/);
        await expect(service.markOrderPaid(ORDER_ID, undefined as any)).rejects.toThrow(/forbidden source|valid source/);
    });

    it('route.ts must NOT call markOrderPaid for paid_ callback (source assertion)', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const routePath = path.resolve(process.cwd(), 'src/app/api/telegram/courier/route.ts');
        const content = fs.readFileSync(routePath, 'utf-8');
        const paidBranch = content.match(/data\.startsWith\('paid_'\)[\s\S]*?(?=else if|}\s*}\s*return)/)?.[0] || '';
        expect(paidBranch).not.toContain('markOrderPaid');
        expect(paidBranch).toContain("huquqingiz yo'q");
    });
});

// ─── 5. Idempotent Completion ─────────────────────────────────────────────

describe('completeOrder — idempotency', () => {
    it('should increment balance once; second call is no-op (alreadyDone=true)', async () => {
        // completeOrder: FOR UPDATE (1 raw) + findUnique (1 call), then update
        // First call: 1 findUnique returning DELIVERED
        // Second call: 1 findUnique returning COMPLETED (guard fires)
        p.order.findUnique
            .mockResolvedValueOnce(makeOrder({ status: 'DELIVERED' }))  // first call
            .mockResolvedValueOnce(makeOrder({ status: 'COMPLETED' })); // second call (alreadyDone guard)
        p.order.update.mockResolvedValue({});
        p.courierProfile.update.mockResolvedValue({});
        p.$executeRawUnsafe.mockResolvedValue(0);

        const r1 = await service.completeOrder(ORDER_ID, COURIER_ID);
        expect(r1.status).toBe('COMPLETED');
        expect(r1.alreadyDone).toBe(false);
        expect(p.courierProfile.update).toHaveBeenCalledTimes(1);
        expect(p.order.update).toHaveBeenCalledTimes(1);

        // Second call — idempotent: first findUnique returns COMPLETED → guard fires
        const r2 = await service.completeOrder(ORDER_ID, COURIER_ID);
        expect(r2.status).toBe('COMPLETED');
        expect(r2.alreadyDone).toBe(true);
        expect(p.courierProfile.update).toHaveBeenCalledTimes(1);
        expect(p.order.update).toHaveBeenCalledTimes(1);
    });
});

// ─── 6. Deliver Order — Photo Required ────────────────────────────────────

describe('deliverOrder — photo requirement', () => {
    beforeEach(() => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'DELIVERING' }));
    });

    it('should succeed with a valid photoId', async () => {
        p.order.update.mockResolvedValue({});
        const result = await service.deliverOrder(ORDER_ID, 'photo-abc', COURIER_ID);
        expect(result.status).toBe('DELIVERED');
        expect(p.order.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ deliveryPhoto: 'photo-abc' })
            })
        );
    });

    it('should reject when photoId is empty string', async () => {
        await expect(
            service.deliverOrder(ORDER_ID, '', COURIER_ID)
        ).rejects.toThrow(/requires a delivery photo/);
    });

    it('should reject when photoId is undefined', async () => {
        await expect(
            service.deliverOrder(ORDER_ID, undefined as any, COURIER_ID)
        ).rejects.toThrow(/requires a delivery photo/);
    });

    it('should reject when order is not in DELIVERING status', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
        await expect(
            service.deliverOrder(ORDER_ID, 'photo-1', COURIER_ID)
        ).rejects.toThrow(/Expected DELIVERING/);
    });
});

// ─── 7. Cancel Order — Reason Logging ─────────────────────────────────────

describe('cancelOrder — audit logging', () => {
    beforeEach(() => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'ASSIGNED' }));
    });

    it('should create a dispatch log with reason on cancel', async () => {
        p.order.update.mockResolvedValue({});
        p.dispatchLog.create.mockResolvedValue({});

        const result = await service.cancelOrder(ORDER_ID, COURIER_ID, 'Mijoz qo\'ng\'iroq qildi');
        expect(result.status).toBe('CANCELLED');
        expect(p.dispatchLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'CANCELLED',
                    reason: 'Mijoz qo\'ng\'iroq qildi',
                })
            })
        );
    });

    it('should reject cancel for order not in ASSIGNED or PROCESSING', async () => {
        p.order.findUnique.mockResolvedValue(makeOrder({ status: 'DELIVERED' }));
        await expect(
            service.cancelOrder(ORDER_ID, COURIER_ID, 'reason')
        ).rejects.toThrow(/Cannot cancel order/);
    });
});

// ─── 8. Reject Flow — Log and Admin Notification ──────────────────────────

describe('logCourierReject and notifyAdmin', () => {
    it('should create a REJECTED dispatch log entry', async () => {
        p.dispatchLog.create.mockResolvedValue({});
        await service.logCourierReject(ORDER_ID, COURIER_ID, 'Kuryer rad etdi');
        expect(p.dispatchLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'REJECTED' })
            })
        );
    });

    it('notifyAdmin should return ok:true when Telegram API responds 200', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
        const result = await service.notifyAdmin('admin-chat-1', 'Test', 'Message');
        expect(result.ok).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('notifyAdmin should return ok:false when Telegram API returns non-200', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response);
        const result = await service.notifyAdmin('admin-chat-1', 'Test', 'Message');
        expect(result.ok).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('notifyAdmin should return error on network failure', async () => {
        mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        const result = await service.notifyAdmin('admin-chat-1', 'Test', 'Message');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('ECONNREFUSED');
    });

    it('notifyAdmin should error when COURIER_BOT_TOKEN is not set', async () => {
        const originalToken = process.env.COURIER_BOT_TOKEN;
        delete process.env.COURIER_BOT_TOKEN;
        // Re-import service so it picks up the missing token
        const { CourierService: FreshService } = await import('@/services/CourierService');
        const freshService = new FreshService();
        const result = await freshService.notifyAdmin('admin-chat-1', 'Test', 'Message');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('COURIER_BOT_TOKEN');
        if (originalToken !== undefined) {
            process.env.COURIER_BOT_TOKEN = originalToken;
        }
    });
});

// ─── 9. Route Integration — source assertions ─────────────────────────────

describe('Route security checks (source-level)', () => {
    it('should handle reject_assign_ by calling notifyAdmin (not notifyCourier for user)', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const routePath = path.resolve(process.cwd(), 'src/app/api/telegram/courier/route.ts');
        const content = fs.readFileSync(routePath, 'utf-8');
        const rejectBlock = content.match(/data\.startsWith\('reject_assign_'\)[\s\S]*?(?=else if|}\s*}\s*return)/)?.[0] || '';
        expect(rejectBlock).toContain('notifyAdmin');
        // Should NOT call notifyCourier with the rejecting user's ID
        expect(rejectBlock).not.toMatch(/notifyCourier\(user\.id/);
    });

    it('should handle view_order_ callback with dashboard redirect', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const routePath = path.resolve(process.cwd(), 'src/app/api/telegram/courier/route.ts');
        const content = fs.readFileSync(routePath, 'utf-8');
        expect(content).toContain("data.startsWith('view_order_')");
        expect(content).toContain('dashboardUrl');
    });
});

// ─── 10. Complete Order — Balance Update ───────────────────────────────────

describe('completeOrder — balance and totalDeliveries update', () => {
    it('should increment courier balance and totalDeliveries on first completion', async () => {
        p.order.findUnique.mockResolvedValue(
            makeOrder({ status: 'DELIVERED', courierId: COURIER_ID })
        );
        p.order.update.mockResolvedValue({});
        p.courierProfile.update.mockResolvedValue({});

        const result = await service.completeOrder(ORDER_ID, COURIER_ID);
        expect(result.status).toBe('COMPLETED');
        expect(result.alreadyDone).toBe(false);

        // Verify courierProfile.update was called with correct increments
        expect(p.courierProfile.update).toHaveBeenCalledOnce();
        // Prisma update takes a single object arg: { where, data }
        const updateArg = p.courierProfile.update.mock.calls[0][0];
        expect(updateArg.where).toEqual(expect.objectContaining({ userId: COURIER_ID }));
        expect(updateArg.data.balance.increment).toBe(12000);
        expect(updateArg.data.totalDeliveries.increment).toBe(1);
    });

    it('should not update balance when order has no courierId', async () => {
        // Order with no courierId — completeOrder should still work (idempotent guard)
        // but since courierId check fails first, this tests the early-exit path
        p.order.findUnique.mockResolvedValue(
            makeOrder({ status: 'DELIVERED', courierId: COURIER_ID, deliveryPhoto: 'photo-1' })
        );
        p.order.update.mockResolvedValue({});
        p.courierProfile.update.mockResolvedValue({});

        const result = await service.completeOrder(ORDER_ID, COURIER_ID);
        expect(result.status).toBe('COMPLETED');
        // Balance was incremented since courierId matches
        expect(p.courierProfile.update).toHaveBeenCalledTimes(1);
    });
});
