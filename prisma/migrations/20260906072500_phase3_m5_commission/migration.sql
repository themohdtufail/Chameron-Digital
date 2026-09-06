-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('GLOBAL', 'CATEGORY', 'STORE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sellerEarning" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "scope" "CommissionScope" NOT NULL,
    "categoryId" TEXT,
    "storeId" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionRule_scope_idx" ON "CommissionRule"("scope");

-- CreateIndex
CREATE INDEX "CommissionRule_storeId_idx" ON "CommissionRule"("storeId");

-- CreateIndex
CREATE INDEX "CommissionRule_categoryId_idx" ON "CommissionRule"("categoryId");

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
