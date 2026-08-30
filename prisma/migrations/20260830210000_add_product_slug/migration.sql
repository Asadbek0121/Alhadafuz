-- AlterTable
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;
CREATE INDEX "Product_slug_idx" ON "Product"("slug");
