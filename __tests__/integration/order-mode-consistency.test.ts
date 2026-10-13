/**
 * Order creation mode consistency — source-level + runtime tests.
 *
 * Verifies that getPaymeMode() in src/lib/payme.ts:
 * - Returns 'production' when PAYME_MODE === 'production'
 * - Returns 'test' when PAYME_MODE === 'test'
 * - Returns 'production' when PAYME_MODE is undefined or any other value
 *
 * And verifies that order creation and payment URL generation routes
 * use this function consistently (not hardcoded testKey checks).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─── Runtime tests: call getPaymeMode() directly ────────────────────────────

describe('getPaymeMode() — runtime behavior', async () => {
    beforeEach(() => {
        delete process.env.PAYME_MODE;
    });

    it('returns production when PAYME_MODE is undefined', async () => {
        const { getPaymeMode } = await import('@/lib/payme');
        expect(getPaymeMode()).toBe('production');
    });

    it('returns production when PAYME_MODE is empty string', async () => {
        process.env.PAYME_MODE = '';
        const { getPaymeMode } = await import('@/lib/payme');
        expect(getPaymeMode()).toBe('production');
    });

    it('returns test when PAYME_MODE is "test"', async () => {
        process.env.PAYME_MODE = 'test';
        const { getPaymeMode } = await import('@/lib/payme');
        expect(getPaymeMode()).toBe('test');
    });

    it('returns production when PAYME_MODE is "production"', async () => {
        process.env.PAYME_MODE = 'production';
        const { getPaymeMode } = await import('@/lib/payme');
        expect(getPaymeMode()).toBe('production');
    });

    it('returns production for invalid PAYME_MODE values', async () => {
        const { getPaymeMode } = await import('@/lib/payme');
        for (const badValue of ['sandbox', 'staging', 'dev', 'PRODUCTION', '123']) {
            process.env.PAYME_MODE = badValue;
            expect(getPaymeMode(), `expected ${badValue} to default to production`).toBe('production');
        }
        // unset
        delete process.env.PAYME_MODE;
        expect(getPaymeMode()).toBe('production');
    });
});

// ─── Source-level tests ──────────────────────────────────────────────────────

describe('getPaymeMode() — source in payme.ts', () => {
    const paymePath = path.resolve(process.cwd(), 'src/lib/payme.ts');
    const content = fs.readFileSync(paymePath, 'utf-8');

    it('must export getPaymeMode function', () => {
        expect(content).toContain('export function getPaymeMode');
    });

    it('must check PAYME_MODE === "production" explicitly', () => {
        expect(content).toContain('mode === "production"');
        expect(content).toContain('return "production"');
    });

    it('must check PAYME_MODE === "test" explicitly', () => {
        expect(content).toContain('mode === "test"');
        expect(content).toContain('return "test"');
    });

    it('must default to production for any other value (no silent fallback to test)', () => {
        // Should have a catch-all return 'production', not just "if test then test"
        expect(content).toContain('return "production"');
        // Should NOT just do ternary with implicit test fallback
        expect(content).not.toMatch(/===\s*'production'\s*\?\s*'production'\s*:\s*'test'/);
    });
});

describe('Orders route — uses shared getPaymeMode', () => {
    const routePath = path.resolve(process.cwd(), 'src/app/api/orders/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    it('must import getPaymeMode from payme lib', () => {
        expect(content).toContain("getPaymeMode");
        expect(content).toContain("@/lib/payme");
    });

    it('must call getPaymeMode() inside buildPaymentUrl for PAYME', () => {
        const fnMatch = content.match(/async function buildPaymentUrl[\s\S]*?^}/m);
        const fnBody = fnMatch![0];
        expect(fnBody).toContain('getPaymeMode()');
        // Must NOT use testKey existence to decide mode
        expect(fnBody).not.toContain('testKey');
    });

    it('must compute isTest from getPaymeMode before order creation', () => {
        expect(content).toContain("const isTest = getPaymeMode() === 'test'");
    });

    it('must include isTest column in the raw SQL INSERT', () => {
        const insertMatch = content.match(/INSERT INTO "Order"[^)]*\)/s);
        expect(insertMatch).not.toBeNull();
        expect(insertMatch![0]).toContain('"isTest"');
    });

    it('must pass isTest value as $21 and orderNumber as $20 in raw SQL', () => {
        // Match the VALUES clause to verify placeholder ordering
        const valuesMatch = content.match(/\) VALUES \([^)]+\)/s);
        expect(valuesMatch).not.toBeNull();
        const valuesBlock = valuesMatch![0];
        // $20 must come before $21 (orderNumber is param 20, isTest is param 21)
        const pos20 = valuesBlock.indexOf('$20');
        const pos21 = valuesBlock.indexOf('$21');
        expect(pos20).toBeGreaterThan(-1);
        expect(pos21).toBeGreaterThan(-1);
        expect(pos20).toBeLessThan(pos21);
        // The argument list must pass orderNumber then isTest
        const argsMatch = content.match(/orderNumber, isTest/);
        expect(argsMatch).not.toBeNull();
    });
});

describe('Generate payment URL route — uses shared getPaymeMode', () => {
    const routePath = path.resolve(
        process.cwd(),
        'src/app/api/orders/[id]/generate-payment-url/route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');

    it('must import getPaymeMode from payme lib', () => {
        expect(content).toContain("getPaymeMode");
    });

    it('must call getPaymeMode() instead of inline PAYME_MODE check', () => {
        expect(content).toContain('getPaymeMode()');
        // Must NOT have inline ternary logic
        expect(content).not.toContain("PAYME_MODE === 'production' ? 'production' : 'test'");
        expect(content).not.toContain("PAYME_MODE === \"production\" ? \"production\" : \"test\"");
    });
});
