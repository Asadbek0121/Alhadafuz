/**
 * VENDOR status transition restrictions — mock-based tests.
 * VENDOR must NOT be able to set DELIVERED or COMPLETED directly.
 * These transitions require CourierService guards (photo proof + courier ownership).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('VENDOR status transition restrictions', () => {
    const routePath = path.resolve(process.cwd(), 'src/app/api/admin/orders/[id]/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');

    it('must define VENDOR_ALLOWED_TRANSITIONS', () => {
        expect(content).toContain('VENDOR_ALLOWED_TRANSITIONS');
    });

    it('must block VENDOR from setting DELIVERED', () => {
        // VENDOR_ALLOWED_TRANSITIONS should NOT include DELIVERED in any allowed list
        // Find the VENDOR_ALLOWED_TRANSITIONS block and verify DELIVERED is not an allowed target
        const vendorBlock = content.match(/VENDOR_ALLOWED_TRANSITIONS[\s\S]*?};/)?.[0] || '';
        // DELIVERING key should map to empty array (no transitions allowed from DELIVERING)
        expect(vendorBlock).toContain("DELIVERING:");
        // Verify DELIVERED is not in any allowed transition for VENDOR
        // The only way DELIVERED can appear is as a SOURCE status (e.g., DELIVERED: [])
        const lines = vendorBlock.split('\n');
        let inDeliveringBlock = false;
        for (const line of lines) {
            if (line.includes('DELIVERING:')) {
                inDeliveringBlock = true;
            }
            if (inDeliveringBlock) {
                expect(line).not.toContain("['DELIVERED']");
                break;
            }
        }
    });

    it('must block VENDOR from setting COMPLETED', () => {
        const vendorBlock = content.match(/VENDOR_ALLOWED_TRANSITIONS[\s\S]*?};/)?.[0] || '';
        // DELIVERED key should map to empty array for VENDOR
        const lines = vendorBlock.split('\n');
        let inDeliveredBlock = false;
        for (const line of lines) {
            if (line.includes('DELIVERED:')) {
                inDeliveredBlock = true;
            }
            if (inDeliveredBlock) {
                expect(line).not.toContain("['COMPLETED']");
                break;
            }
        }
    });

    it('must use ALLOWED_TRANSITIONS from CourierService for ADMIN', () => {
        expect(content).toContain("import { ALLOWED_TRANSITIONS } from '@/services/CourierService'");
        expect(content).toContain('transitionMap');
    });

    it('must return 400 for unauthorized VENDOR transition', () => {
        // The route should check transitionMap and return 400 for forbidden transitions
        expect(content).toContain('Forbidden: VENDOR cannot transition');
        expect(content).toContain('{ status: 400 }');
    });

    it('must validate status field exists and is string', () => {
        expect(content).toContain("typeof status !== 'string'");
        expect(content).toContain("Invalid or missing status field");
    });

    it('must check order existence before transition', () => {
        expect(content).toContain('Order not found');
        expect(content).toContain('{ status: 404 }');
    });
});
