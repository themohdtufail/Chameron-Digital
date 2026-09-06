-- CreateEnum
CREATE TYPE "StoreDocumentType" AS ENUM ('SHOP_PROOF', 'GST', 'FSSAI', 'BUSINESS_CERTIFICATE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'WHATSAPP');

-- AlterEnum
ALTER TYPE "StoreStatus" ADD VALUE 'UNDER_REVIEW';

-- CreateTable
CREATE TABLE "StoreDocument" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "StoreDocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreDocument_storeId_idx" ON "StoreDocument"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");

-- AddForeignKey
ALTER TABLE "StoreDocument" ADD CONSTRAINT "StoreDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
