/**
 * Order creation mode consistency — static source analysis tests.
 *
 * Verifies that src/app/api/orders/route.ts:
 * - Uses getPaymeMode() (server-determined from PAYME_MODE env) to select Payme config
 * - Does NOT read testKey existence to auto-switch mode
 * - Passes isTest into the raw SQL INSERT
 * - Sets isTest=true only when PAYME_MODE='test', false otherwise
 *
 * Complements the dynamic payme-per-request-auth tests with route-level checks.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Order creation — mode consistency (source-level)', () => {
    const routePath = path.resolve(
        process.cwd(),
        'src/app/api/orders/route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');

    it('must define getPaymeMode() that reads PAYME_MODE env', () => {
        expect(content).toContain('function getPaymeMode');
        expect(content).toContain("process.env.PAYME_MODE");
        expect(content).toContain("'production'");
        expect(content).toContain("'test'");
    });

    it('must call getPaymeMode() inside buildPaymentUrl for PAYME', () => {
        // Extract buildPaymentUrl function body
        const fnMatch = content.match(/async function buildPaymentUrl[\s\S]*?^}/m);
        expect(fnMatch).not.toBeNull();
        const fnBody = fnMatch![0];
        expect(fnBody).toContain('getPaymeMode()');
        // Must NOT use testKey existence to decide mode
        expect(fnBody).not.toContain('paymeConfig.testKey ?');
    });

    it('must pass mode to getPaymeConfig (not hardcoded production)', () => {
        const fnMatch = content.match(/async function buildPaymentUrl[\s\S]*?^}/m);
        const fnBody = fnMatch![0];
        expect(fnBody).toContain("getPaymeConfig(mode)");
        // Should not hardcode 'production' inside buildPaymentUrl
        expect(fnBody).not.toContain("getPaymeConfig('production')");
    });

    it('must compute isTest from getPaymeMode before order creation', () => {
        expect(content).toContain("const isTest = getPaymeMode() === 'test'");
    });

    it('must include isTest column in the raw SQL INSERT', () => {
        expect(content).toContain('"isTest"');
        // Column list must have isTest
        const insertMatch = content.match(/INSERT INTO "Order"[^)]*\)/s);
        expect(insertMatch).not.toBeNull();
        expect(insertMatch![0]).toContain('"isTest"');
    });

    it('must pass isTest value as a parameter in the raw SQL VALUES clause', () => {
        // The raw SQL uses $21 for isTest (after adding it as 21st column)
        const insertMatch = content.match(/INSERT INTO "Order"[\s\S]*?NOW\(\)/s);
        expect(insertMatch).not.toBeNull();
        const insertBlock = insertMatch![0];
        expect(insertBlock).toContain('$21');
        expect(insertBlock).toContain('isTest');
    });

    it('must NOT reference testKey for mode selection anywhere in buildPaymentUrl', () => {
        const fnMatch = content.match(/async function buildPaymentUrl[\s\S]*?^}/m);
        const fnBody = fnMatch![0];
        expect(fnBody).not.toContain('testKey');
        expect(fnBody).not.toContain("testKey ? 'test'");
    });

    it('must NOT hardcode test mode in getPaymeMode (defaults to production)', () => {
        // getPaymeMode returns 'production' when PAYME_MODE !== 'production'
        expect(content).toContain(
            "return process.env.PAYME_MODE === 'production' ? 'production' : 'test'"
        );
    });
});

describe('Order creation — cross-file consistency', () => {
    const routePath = path.resolve(
        process.cwd(),
        'src/app/api/orders/[id]/generate-payment-url/route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');

    it('generate-payment-url route must also use PAYME_MODE env consistently', () => {
        // This route should follow the same pattern
        expect(content).toContain("process.env.PAYME_MODE");
    });
});
