-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "fulfillmentType" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "fulfillmentType" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fulfillmentType" TEXT NOT NULL DEFAULT 'LOCAL';

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "weight" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cargo_orderId_idx" ON "Cargo"("orderId");

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
