import { prisma } from "@/lib/db";
import type { SubscriptionStatus } from "@prisma/client";

export interface PlanFeatures {
  /** null = unlimited. */
  maxProducts: number | null;
  ai: boolean;
  whatsappTemplates: boolean;
  advancedAnalytics: boolean;
}

export const STARTER_FEATURES: PlanFeatures = {
  maxProducts: 20,
  ai: false,
  whatsappTemplates: false,
  advancedAnalytics: false,
};

/**
 * Pure lazy-expiry check — no I/O, so the "does this subscription still
 * count as live" decision is unit-testable without a database. The
 * caller (hasFeature/getPlanFeatures below) is responsible for writing
 * the EXPIRED transition back when this returns false for an ACTIVE/TRIAL
 * row; no cron job is needed since every read re-evaluates this.
 */
export function isSubscriptionLive(
  subscription: { status: SubscriptionStatus; expiryDate: Date },
  now: Date = new Date()
): boolean {
  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIAL") return false;
  return subscription.expiryDate.getTime() > now.getTime();
}

/**
 * Pure feature resolution: a live subscription gets its plan's features;
 * an expired/cancelled/missing one falls back to STARTER — a lapsed
 * subscription downgrades the store rather than locking it out entirely,
 * matching how most SaaS products handle non-renewal.
 */
export function resolvePlanFeatures(
  subscription: { status: SubscriptionStatus; expiryDate: Date; features: PlanFeatures } | null,
  now: Date = new Date()
): PlanFeatures {
  if (!subscription || !isSubscriptionLive(subscription, now)) return STARTER_FEATURES;
  return subscription.features;
}

/** Loads a store's subscription + plan, lazily flipping ACTIVE/TRIAL to
 * EXPIRED in the database the first time it's read past its expiryDate. */
async function loadLiveSubscription(storeId: string) {
  const subscription = await prisma.sellerSubscription.findUnique({
    where: { storeId },
    include: { plan: true },
  });
  if (!subscription) return null;

  if (!isSubscriptionLive(subscription) && (subscription.status === "ACTIVE" || subscription.status === "TRIAL")) {
    await prisma.sellerSubscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } });
    return { ...subscription, status: "EXPIRED" as SubscriptionStatus };
  }
  return subscription;
}

export async function getPlanFeatures(storeId: string): Promise<PlanFeatures> {
  const subscription = await loadLiveSubscription(storeId);
  if (!subscription) return STARTER_FEATURES;
  return resolvePlanFeatures({
    status: subscription.status,
    expiryDate: subscription.expiryDate,
    features: subscription.plan.features as unknown as PlanFeatures,
  });
}

export async function hasFeature(storeId: string, key: keyof Omit<PlanFeatures, "maxProducts">): Promise<boolean> {
  const features = await getPlanFeatures(storeId);
  return Boolean(features[key]);
}
