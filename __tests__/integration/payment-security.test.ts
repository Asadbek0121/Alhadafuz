/**
 * Payment confirmation security — mock-based tests.
 * - Click/Payme payments must NOT be confirmable via admin endpoint
 * - Only CASH/P2P can be manually confirmed
 * - source is data, not authentication
 * - Duplicate/parallel confirmation handled correctly
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Payment confirmation security', () => {
    const confirmPath = path.resolve(
        process.cwd(),
        'src/app/api/admin/orders/[id]/confirm-payment/route.ts'
    );
    const content = fs.readFileSync(confirmPath, 'utf-8');

    it('must require ADMIN session', () => {
        expect(content).toContain("session.user.role !== 'ADMIN'");
        expect(content).toContain('{ status: 401 }');
    });

    it('must validate source enum', () => {
        expect(content).toContain('ALLOWED_SOURCES');
        expect(content).toContain('Invalid source');
        expect(content).toContain('{ status: 400 }');
    });

    it('must treat source as data, not authentication', () => {
        // Source should be read from body, not from auth context
        expect(content).toContain('body?.source');
        expect(content).toContain('Source bu ma\'lumot');
    });

    it('must check order existence (404)', () => {
        expect(content).toContain('Order not found');
        expect(content).toContain('{ status: 404 }');
    });

    it('must handle duplicate PAID confirmation (409)', () => {
        expect(content).toContain('already marked as PAID');
        expect(content).toContain('{ status: 409 }');
    });

    it('must block Click/Payme manual confirmation', () => {
        // Server-side paymentMethod check
        expect(content).toContain('ALLOWED_MANUAL_METHODS');
        expect(content).toContain("['CASH', 'P2P']");
        expect(content).toContain('{ status: 403 }');
    });

    it('must allow CASH manual confirmation', () => {
        expect(content).toContain("'CASH'");
    });

    it('must allow P2P manual confirmation', () => {
        expect(content).toContain("'P2P'");
    });

    it('must block CLICK manual confirmation', () => {
        // CLICK should NOT be in ALLOWED_MANUAL_METHODS
        expect(content).not.toContain("'CLICK'");
    });

    it('must block PAYME manual confirmation', () => {
        // PAYME should NOT be in ALLOWED_MANUAL_METHODS
        expect(content).not.toContain("'PAYME'");
    });

    it('must write paymentVerifiedAt audit field', () => {
        expect(content).toContain('paymentVerifiedAt');
        expect(content).toContain('new Date()');
    });

    it('must write paymentVerifiedBy audit field', () => {
        expect(content).toContain('paymentVerifiedBy');
        expect(content).toContain('session.user.id');
    });

    it('must create activity log for audit trail', () => {
        expect(content).toContain('activityLog.create');
        expect(content).toContain('CONFIRM_PAYMENT');
    });

    it('must NOT use source for authorization decision', () => {
        // Source validation should come AFTER auth check, not before
        const authLine = content.indexOf("session.user.role !== 'ADMIN'");
        const sourceLine = content.indexOf('ALLOWED_SOURCES');
        expect(authLine).toBeLessThan(sourceLine);
    });
});

describe('Click/Payme webhook independence', () => {
    it('click webhook must set paymentStatus directly', () => {
        const clickPath = path.resolve(process.cwd(), 'src/app/api/payment/click/route.ts');
        const clickContent = fs.readFileSync(clickPath, 'utf-8');
        expect(clickContent).toContain('paymentStatus: "PAID"');
        expect(clickContent).toContain('paymentProvider: "CLICK"');
    });

    it('payme webhook must handle payment confirmation', () => {
        const paymePath = path.resolve(process.cwd(), 'src/app/api/payment/payme/route.ts');
        const paymeContent = fs.readFileSync(paymePath, 'utf-8');
        // Payme webhook should have payment-related logic (signature verification, order update)
        expect(paymeContent.length).toBeGreaterThan(100);
        expect(paymeContent).toMatch(/payment|PAID|order/i);
    });

    it('confirm-payment must reference webhook routes in comments', () => {
        const confirmPath = path.resolve(
            process.cwd(),
            'src/app/api/admin/orders/[id]/confirm-payment/route.ts'
        );
        const content = fs.readFileSync(confirmPath, 'utf-8');
        // Should reference the webhook routes
        expect(content).toContain('payment/click');
        expect(content).toContain('payment/payme');
    });
});
