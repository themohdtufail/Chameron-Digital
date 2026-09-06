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
