-- Mavjud buyurtmalarga readable order number berish
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

-- Backfill: eski orderlar uchun uniq raqam generatsiya
UPDATE "Order" SET "orderNumber" = '100' || LPAD((ROW_NUMBER() OVER (ORDER BY "createdAt"))::text, 4, '0')
WHERE "orderNumber" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
