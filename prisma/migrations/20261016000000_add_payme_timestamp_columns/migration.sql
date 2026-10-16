-- Add paymePerformTime and paymeCancelTime columns to Order
-- These columns persist idempotent timestamps for PerformTransaction and CancelTransaction responses.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymePerformTime" BIGINT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymeCancelTime" BIGINT;
