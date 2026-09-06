import { prisma } from "@/lib/db";
import { hasFeature } from "@/lib/subscription";
import type { NotificationType } from "@prisma/client";

interface TemplateLike {
  title: string;
  body: string;
}

/**
 * Pure placeholder rendering — no I/O, so it's unit-testable without a
 * database. An unmatched {{token}} is left as-is rather than blanked, so a
 * missing var shows up obviously in QA instead of silently disappearing.
 */
export function renderTemplate(template: TemplateLike, vars: Record<string, string | number>): TemplateLike {
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
  return { title: fill(template.title), body: fill(template.body) };
}

/**
 * WhatsApp Business API seam — no credentials exist in this sandbox, so
 * this stays a structured, swappable stub (mirrors src/lib/otp.ts's
 * dev-mode branch): logging today, a real API call is a body-swap here
 * once credentials exist, with no call site changes needed.
 */
export async function sendWhatsApp(phone: string, message: string) {
  // eslint-disable-next-line no-console
  console.log(`[WhatsApp] Would send to ${phone}: ${message}`);
}

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedOrderId?: string;
  relatedProductRequestId?: string;
  /** Key of a seeded NotificationTemplate (IN_APP channel) to render
   * instead of the literal title/body above — falls back to the literal
   * values when no template with this key exists (e.g. seed hasn't run).
   * A `${templateKey}_whatsapp` template, if seeded, also triggers
   * sendWhatsApp() to the user's phone with the same vars. */
  templateKey?: string;
  vars?: Record<string, string | number>;
  /** The order's store, when known — gates the WhatsApp send behind that
   * store's plan (GROWTH+ only). Omitted for notifications with no store
   * context (e.g. none today), which skip the WhatsApp branch entirely. */
  storeId?: string;
}

/**
 * Provider-agnostic notification seam: the in-app Notification table is
 * always written; WhatsApp is opt-in per event via templateKey, added on
 * top without touching any call site that doesn't pass one — same
 * pattern as the OTP dev-mode / StorageDriver seams.
 */
export async function createNotification(input: CreateNotificationInput) {
  let title = input.title;
  let body = input.body;

  if (input.templateKey) {
    const template = await prisma.notificationTemplate.findUnique({ where: { key: input.templateKey } });
    if (template) {
      const rendered = renderTemplate(template, input.vars ?? {});
      title = rendered.title;
      body = rendered.body;
    }

    const waTemplate = await prisma.notificationTemplate.findUnique({
      where: { key: `${input.templateKey}_whatsapp` },
    });
    if (waTemplate && (!input.storeId || (await hasFeature(input.storeId, "whatsappTemplates")))) {
      const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { phone: true } });
      if (user) {
        await sendWhatsApp(user.phone, renderTemplate(waTemplate, input.vars ?? {}).body);
      }
    }
  }

  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title,
      body,
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
  storeId: string;
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

  if (justRanOut) {
    await createNotification({
      userId: storeOwnerId,
      type: "LOW_STOCK",
      title: "Product out of stock",
      body: `${productName} is now out of stock.`,
    });
    return;
  }

  await createNotification({
    userId: storeOwnerId,
    type: "LOW_STOCK",
    title: "Product running low",
    body: `${productName} is down to ${newStock} unit${newStock === 1 ? "" : "s"} — below your threshold of ${threshold}.`,
    templateKey: "low_stock",
    vars: { productName, stock: newStock, threshold },
    storeId: input.storeId,
  });
}
