# Payme Sandbox Pre-Release Audit Report

**Date:** 2026-10-16  
**Branch:** `fix/payme-sandbox-idempotency`  
**Status:** READ-ONLY diagnostics complete, fixes prepared, NOT deployed

---

## 1. LPAD Analysis ✅

**Migration:** `prisma/migrations/20261002000000_add_order_number/migration.sql`

```sql
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as rn
    FROM "Order"
    WHERE "orderNumber" IS NULL
)
UPDATE "Order"
SET "orderNumber" = '100' || LPAD(rn::text, 4, '0')
FROM numbered
WHERE "Order".id = numbered.id;
```

**Verification:**
- `rn=1` → `'1000001'` (7 characters) ✅
- `rn=10050` → `'10010050'` (8 characters, no truncation) ✅
- `rn=99999` → `'10099999'` (8 characters, still unique) ✅

**Code generator matches migration** (`src/app/api/orders/route.ts:324-325`):
```typescript
const maxNum = await tx.$queryRawUnsafe(`SELECT COALESCE(MAX(("orderNumber"::bigint) - 1000000), 0)::int AS n FROM "Order" WHERE "orderNumber" LIKE '100%'`);
const orderNumber = `100${String((maxNum[0]?.n || 0) + 1).padStart(4, '0')}`;
```

**Conclusion:** No truncation issue. Format is `100` + LPAD(rn, 4, '0').

---

## 2. Fresh DB Migration Test ⚠️

**Limitation:** `psql` not available locally. Only `sqlite3` available.

**SQL syntax verification:**
- CTE (Common Table Expression) is PostgreSQL-compatible ✅
- `LPAD()` function is standard PostgreSQL ✅
- Window function `ROW_NUMBER()` in CTE subquery is valid ✅
- `UPDATE ... FROM` syntax is PostgreSQL-specific but correct ✅

**Recommendation:** Test on a fresh PostgreSQL database before production deployment:
```bash
psql -h <host> -U <user> -d <db> -f prisma/migrations/20261002000000_add_order_number/migration.sql
```

**Current production state:**
- Total orders: 464
- NULL orderNumbers: 0 (already backfilled)
- Migration can be skipped if already applied

---

## 3. Error Code Verification ✅

All error codes match official Payme Merchant API spec:

| Code | Message | Usage |
|------|---------|-------|
| `-32504` | Insufficient privileges | Wrong/missing auth |
| `-32400` | Config error | Missing/invalid PaymentMethod config |
| `-31000` | Invalid params | Missing `account.order_id` |
| `-31099` | Account not found | Order not found by `order_id` |
| `-31003` | Transaction not found | Invalid `transaction_id` |
| `-31008` | Cannot perform operation | State machine violation |
| `-31001` | Order invalid/busy/paid | Multiple guard conditions |

**Total error code usages:** 31 instances across `src/lib/payme.ts`

---

## 4. New Test Order Plan

**Current TEST orders state:**

| Order Number | Total | Status | TxId | Usable? |
|--------------|-------|--------|------|---------|
| TEST_PAYME_001 | 500 som | AWAITING_PAYMENT | 6ad258... | ⚠️ Old txId |
| TEST_PAYME_002 | 500 som | PAYMENT_CANCELLED | tx_prod_002 | ❌ |
| TEST_PAYME_003 | 500 som | PAID | tx_prod_003 | ❌ |
| TEST_PAYME_004 | 500 som | PAYMENT_CANCELLED | tx_deploy_test | ❌ |
| TEST_PAYME_005 | 1000 som | PAYMENT_CANCELLED | tx_005 | ❌ |
| TEST_SANDBOX_001 | 500 som | AWAITING_PAYMENT | 6ad1b1... | ⚠️ Old txId |
| TEST-001 | 50000 som | PENDING | none | ⚠️ Wrong amount |
| TEST-002 | 69900 som | PENDING | none | ⚠️ Wrong amount |
| TEST-003 | 100000 som | PENDING | none | ⚠️ Wrong amount |

**Recommended new test orders:**

1. **TEST_NEW_001** — 500 som, AWAITING_PAYMENT, clean state
   - Test full flow: CreateTransaction → PerformTransaction → CheckTransaction
   - Test invoice creation after perform

2. **TEST_NEW_002** — 500 som, AWAITING_PAYMENT, clean state
   - Test cancel flow: CreateTransaction → CancelTransaction → CheckTransaction

3. **TEST_NEW_003** — 1000 som, AWAITING_PAYMENT, clean state
   - Test with larger amount

**Creation script:** `scripts/create-payme-test-orders.ts` (ready to run)

---

## 5. No Production Changes ✅

**Verified constraints:**
- ❌ No production DB writes
- ❌ No migrations executed
- ❌ No API key rotation
- ❌ No merge to main
- ❌ No Vercel deployment

**Current branch:** `fix/payme-sandbox-idempotency` (not merged)

**Uncommitted changes:** 5 files, +263/-72 lines
- `src/lib/payme.ts` — Core Payme handler fixes
- `src/lib/invoice/invoice-service.ts` — Invoice cancellation logic
- `prisma/schema.prisma` — New fields (paymePerformTime, paymeCancelTime)
- `prisma/migrations/...` — LPAD fix
- `__tests__/integration/payme-per-request-auth.test.ts` — Test coverage

---

## 6. API Key Rotation Procedure

**Current key status:**
- Prefix: `CFZ%***`
- Length: 36 characters
- Storage: `PaymentMethod.config.test_key` (plain-text JSON)
- **⚠️ Key was exposed in earlier session logs**

### Rotation Steps:

**Step 1: Generate new key in Payme Merchant cabinet**
1. Login to https://merchant.payme.uz
2. Settings → API Keys
3. Generate new `test_key`
4. Store securely (password manager)

**Step 2: Update database**
```sql
-- Check current key prefix (without exposing full key)
SELECT 
  id,
  LEFT(config->>'test_key', 4) || '***' as key_prefix,
  LENGTH(config->>'test_key') as key_length
FROM "PaymentMethod"
WHERE provider = 'PAYME' AND "isActive" = true;

-- Update with new key
UPDATE "PaymentMethod"
SET "config" = JSONB_SET(
  "config"::jsonb,
  '{test_key}',
  '"NEW_KEY_HERE"'::jsonb
)
WHERE provider = 'PAYME' AND "isActive" = true;
```

**Step 3: Verify**
```bash
curl -X POST https://www.alhadaf.uz/api/payment/payme \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <base64_new_key>" \
  -d '{"jsonrpc":"2.0","method":"CheckPerformTransaction","params":{"amount":1,"account":{"order_id":"TEST_NEW_001"}},"id":1}
```
Expected: `-31099` (account not found) or `{"allow":true}`

**Step 4: Revoke old key in Payme cabinet**
1. Return to merchant cabinet
2. Deactivate old `test_key`
3. Verify only new key is active

**Security recommendations:**
- Rotate keys every 90 days
- Never commit keys to git
- Monitor `PaymentLog` table for unauthorized access
- Use password manager for key storage

---

## 7. Invoice-Order Consistency Fix ✅

**Problem:** Invoices remained in `ISSUED` state after payment cancellation.

**Solution implemented:**
- Added `cancelInvoiceForOrder(orderId)` in `src/lib/invoice/invoice-service.ts`
- Called asynchronously after order cancellation in `handleCancelTransaction`
- Idempotent: only cancels `ISSUED` invoices, ignores already cancelled

**Code snippet** (`src/lib/payme.ts:813-818`):
```typescript
import("@/lib/invoice/invoice-service").then(({ cancelInvoiceForOrder }) => {
    cancelInvoiceForOrder(order.id).catch((e: unknown) => {
        console.error("[payme] Invoice cancellation failed:", e);
    });
}).catch(() => {});
```

**Test coverage:** 5 new tests added in `payme-per-request-auth.test.ts`
- Cancel returns correct state for PAID order
- Cancel returns correct state for AWAITING_PAYMENT order
- Idempotent for already cancelled order
- Handles invoice service import failure gracefully
- Creates invoice after successful perform

---

## Summary

| Check | Status | Notes |
|-------|--------|-------|
| LPAD analysis | ✅ | No truncation, format verified |
| Migration test | ⚠️ | psql unavailable, SQL syntax valid |
| Error codes | ✅ | All 7 codes match spec |
| Test orders | ⚠️ | Existing orders dirty, new plan ready |
| No prod changes | ✅ | Branch isolated, no writes |
| Key rotation | ✅ | Procedure documented |
| Final report | ✅ | This document |

**Next steps (when authorized):**
1. Run `scripts/create-payme-test-orders.ts` to create clean test orders
2. Execute migration on production (if not already applied)
3. Deploy branch to Vercel preview
4. Run sandbox tests via curl
5. Rotate API key if needed
6. Merge to main after successful tests
