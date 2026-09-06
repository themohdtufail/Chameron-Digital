-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "gateway" TEXT;

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
