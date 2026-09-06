import { describe, it, expect } from "vitest";
import { isSubscriptionLive, resolvePlanFeatures, STARTER_FEATURES, type PlanFeatures } from "@/lib/subscription";

const GROWTH_FEATURES: PlanFeatures = { maxProducts: 200, ai: true, whatsappTemplates: true, advancedAnalytics: false };

describe("isSubscriptionLive", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("is live for an ACTIVE subscription before its expiry", () => {
    expect(isSubscriptionLive({ status: "ACTIVE", expiryDate: new Date("2026-02-01") }, now)).toBe(true);
  });

  it("is live for a TRIAL subscription before its expiry", () => {
    expect(isSubscriptionLive({ status: "TRIAL", expiryDate: new Date("2026-02-01") }, now)).toBe(true);
  });

  it("is not live once expiryDate has passed, even if status is still ACTIVE", () => {
    expect(isSubscriptionLive({ status: "ACTIVE", expiryDate: new Date("2026-01-01") }, now)).toBe(false);
  });

  it("is never live for EXPIRED or CANCELLED regardless of expiryDate", () => {
    expect(isSubscriptionLive({ status: "EXPIRED", expiryDate: new Date("2027-01-01") }, now)).toBe(false);
    expect(isSubscriptionLive({ status: "CANCELLED", expiryDate: new Date("2027-01-01") }, now)).toBe(false);
  });
});

describe("resolvePlanFeatures", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("returns the plan's own features when the subscription is live", () => {
    const result = resolvePlanFeatures(
      { status: "ACTIVE", expiryDate: new Date("2026-02-01"), features: GROWTH_FEATURES },
      now
    );
    expect(result).toEqual(GROWTH_FEATURES);
  });

  it("falls back to STARTER once the subscription has expired", () => {
    const result = resolvePlanFeatures(
      { status: "ACTIVE", expiryDate: new Date("2026-01-01"), features: GROWTH_FEATURES },
      now
    );
    expect(result).toEqual(STARTER_FEATURES);
  });

  it("falls back to STARTER for a CANCELLED subscription", () => {
    const result = resolvePlanFeatures(
      { status: "CANCELLED", expiryDate: new Date("2027-01-01"), features: GROWTH_FEATURES },
      now
    );
    expect(result).toEqual(STARTER_FEATURES);
  });

  it("falls back to STARTER when there is no subscription at all", () => {
    expect(resolvePlanFeatures(null, now)).toEqual(STARTER_FEATURES);
  });
});
