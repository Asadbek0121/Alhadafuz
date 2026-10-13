-- Add isTest column to Order for sandbox/production isolation
ALTER TABLE "Order" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster sandbox order queries
CREATE INDEX "Order_isTest_idx" ON "Order"("isTest");
