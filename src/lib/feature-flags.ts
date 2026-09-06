import { prisma } from "@/lib/db";

/** Catalog of every flag the admin feature-flags page renders — a missing
 * FeatureFlag row for a key means enabled, so every flag defaults to
 * today's behavior until an admin explicitly flips it off. */
export const FEATURE_FLAG_CATALOG = [
  { key: "ai_assistant", label: "AI assistant", description: "Seller product-description, marketing-content, and insights endpoints." },
  { key: "online_payments", label: "Online payments", description: "Accept the ONLINE payment method at checkout. Cash on delivery is unaffected." },
  { key: "coupons", label: "Coupons", description: "Allow a coupon code to be applied at checkout." },
  { key: "reviews", label: "Reviews", description: "Allow buyers to leave a review on a delivered order." },
  { key: "delivery_partner_assignment", label: "Delivery partner assignment", description: "Allow sellers and admins to assign a delivery partner to an order." },
] as const;

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  return flag?.isEnabled ?? true;
}
