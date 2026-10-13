-- Add paymeTransactionId and paymeTransactionTime columns to Order
-- These columns track Payme transaction IDs for idempotent transaction handling.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeTransactionId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeTransactionTime" BIGINT;

-- Ensure uniqueness on transaction ID (Payme requires this)
CREATE UNIQUE INDEX IF NOT EXISTS "Order_paymeTransactionId_key" ON "Order"("paymeTransactionId") WHERE "paymeTransactionId" IS NOT NULL;

-- Index for fast lookups by transaction ID (PerformTransaction, CheckTransaction, CancelTransaction)
CREATE INDEX IF NOT EXISTS "Order_paymeTransactionId_idx" ON "Order"("paymeTransactionId");
