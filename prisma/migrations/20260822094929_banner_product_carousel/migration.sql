-- CreateTable
CREATE TABLE "BannerProduct" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BannerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BannerProduct_bannerId_order_idx" ON "BannerProduct"("bannerId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BannerProduct_bannerId_productId_key" ON "BannerProduct"("bannerId", "productId");

-- CreateIndex
CREATE INDEX "Banner_position_idx" ON "Banner"("position");

-- CreateIndex
CREATE INDEX "Banner_isActive_idx" ON "Banner"("isActive");

-- AddForeignKey
ALTER TABLE "BannerProduct" ADD CONSTRAINT "BannerProduct_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerProduct" ADD CONSTRAINT "BannerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
