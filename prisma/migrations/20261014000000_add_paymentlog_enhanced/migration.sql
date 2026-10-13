-- Add enhanced fields to PaymentLog for better audit trail

ALTER TABLE "PaymentLog" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "PaymentLog" ADD COLUMN IF NOT EXISTS "errorCode" TEXT;
ALTER TABLE "PaymentLog" ADD COLUMN IF NOT EXISTS "orderId" TEXT;

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS "PaymentLog_orderId_idx" ON "PaymentLog"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentLog_provider_idx" ON "PaymentLog"("provider");
CREATE INDEX IF NOT EXISTS "PaymentLog_createdAt_idx" ON "PaymentLog"("createdAt");
