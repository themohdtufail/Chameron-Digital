import { prisma } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedOrderId?: string;
  relatedProductRequestId?: string;
}

/**
 * Provider-agnostic notification seam: only the in-app Notification table is
 * written today. Push/email/WhatsApp/SMS can be added here later without
 * touching any call site — same pattern as the OTP dev-mode seam.
 */
export async function createNotification(input: CreateNotificationInput) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedOrderId: input.relatedOrderId,
      relatedProductRequestId: input.relatedProductRequestId,
    },
  });
}

/**
 * Notifies the seller exactly once at the moment stock crosses into "low"
 * or "out" territory, rather than on every subsequent order — comparing
 * the before/after stock level is what keeps this from spamming the
 * seller once a product is already sitting at low stock.
 */
export async function notifyLowStockIfCrossed(input: {
  storeOwnerId: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  threshold: number;
}) {
  const { storeOwnerId, productName, previousStock, newStock, threshold } = input;
  const justRanOut = previousStock > 0 && newStock <= 0;
  const justWentLow = previousStock > threshold && newStock > 0 && newStock <= threshold;
  if (!justRanOut && !justWentLow) return;

  await createNotification({
    userId: storeOwnerId,
    type: "LOW_STOCK",
    title: justRanOut ? "Product out of stock" : "Product running low",
    body: justRanOut
      ? `${productName} is now out of stock.`
      : `${productName} is down to ${newStock} unit${newStock === 1 ? "" : "s"} — below your threshold of ${threshold}.`,
  });
}
