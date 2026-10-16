-- Mavjud buyurtmalarga readable order number berish
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

-- Backfill: eski orderlar uchun uniq raqam generatsiya
-- PostgreSQL UPDATE da window functions ishlamaydi, shuning uchun CTE ishlatamiz
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as rn
    FROM "Order"
    WHERE "orderNumber" IS NULL
)
UPDATE "Order"
SET "orderNumber" = '100' || LPAD(rn::text, 4, '0')
FROM numbered
WHERE "Order".id = numbered.id;

ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
