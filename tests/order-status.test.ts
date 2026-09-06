import { describe, it, expect } from "vitest";
import { canTransition, ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/lib/order-status";

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
];

describe("canTransition — the seller/admin forward path", () => {
  const forwardSteps: [OrderStatus, OrderStatus][] = [
    ["PENDING", "CONFIRMED"],
    ["CONFIRMED", "PREPARING"],
    ["PREPARING", "READY"],
    ["READY", "OUT_FOR_DELIVERY"],
    ["OUT_FOR_DELIVERY", "DELIVERED"],
  ];

  it.each(forwardSteps)("allows SELLER to move %s -> %s", (from, to) => {
    expect(canTransition(from, to, "SELLER")).toEqual({ allowed: true });
  });

  it.each(forwardSteps)("allows ADMIN to move %s -> %s", (from, to) => {
    expect(canTransition(from, to, "ADMIN")).toEqual({ allowed: true });
  });

  it("allows SELLER to reject a PENDING order", () => {
    expect(canTransition("PENDING", "REJECTED", "SELLER")).toEqual({ allowed: true });
  });

  it("allows SELLER to reject a CONFIRMED order", () => {
    expect(canTransition("CONFIRMED", "REJECTED", "SELLER")).toEqual({ allowed: true });
  });

  it("rejects skipping a step forward (PENDING -> PREPARING)", () => {
    const result = canTransition("PENDING", "PREPARING", "SELLER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects moving backward (PREPARING -> CONFIRMED)", () => {
    const result = canTransition("PREPARING", "CONFIRMED", "SELLER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects any transition out of a terminal state", () => {
    for (const terminal of ["DELIVERED", "CANCELLED", "REJECTED"] as OrderStatus[]) {
      const result = canTransition(terminal, "CONFIRMED", "SELLER");
      expect(result.allowed).toBe(false);
    }
  });

  it("rejects rejecting an order that is already past PREPARING", () => {
    const result = canTransition("READY", "REJECTED", "SELLER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(400);
  });
});

describe("canTransition — delivery-partner fulfillment path", () => {
  it("allows SELLER/ADMIN to hand an order to a delivery partner (READY -> PICKED_UP)", () => {
    expect(canTransition("READY", "PICKED_UP", "SELLER")).toEqual({ allowed: true });
    expect(canTransition("READY", "PICKED_UP", "ADMIN")).toEqual({ allowed: true });
  });

  it("still allows self-fulfillment straight from READY (no partner involved)", () => {
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "SELLER")).toEqual({ allowed: true });
  });

  it("allows a DELIVERY_PARTNER to advance PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED", () => {
    expect(canTransition("PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERY_PARTNER")).toEqual({ allowed: true });
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_PARTNER")).toEqual({ allowed: true });
  });

  it("rejects a DELIVERY_PARTNER touching any of the seller's prep steps", () => {
    for (const [from, to] of [
      ["PENDING", "CONFIRMED"],
      ["CONFIRMED", "PREPARING"],
      ["PREPARING", "READY"],
      ["READY", "PICKED_UP"],
      ["READY", "OUT_FOR_DELIVERY"],
    ] as [OrderStatus, OrderStatus][]) {
      const result = canTransition(from, to, "DELIVERY_PARTNER");
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(400);
    }
  });

  it("rejects a DELIVERY_PARTNER cancelling an order", () => {
    const result = canTransition("PENDING", "CANCELLED", "DELIVERY_PARTNER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });
});

describe("canTransition — buyer cancellation", () => {
  it("allows the buyer to cancel a PENDING order", () => {
    expect(canTransition("PENDING", "CANCELLED", "BUYER")).toEqual({ allowed: true });
  });

  it("allows the buyer to cancel a CONFIRMED order", () => {
    expect(canTransition("CONFIRMED", "CANCELLED", "BUYER")).toEqual({ allowed: true });
  });

  it("rejects cancelling once the seller has started preparing it", () => {
    const result = canTransition("PREPARING", "CANCELLED", "BUYER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(400);
  });

  it("rejects cancelling a delivered order", () => {
    const result = canTransition("DELIVERED", "CANCELLED", "BUYER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(400);
  });
});

describe("canTransition — authorization boundaries", () => {
  it("rejects a SELLER cancelling an order (only the buyer can cancel)", () => {
    const result = canTransition("PENDING", "CANCELLED", "SELLER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("rejects an ADMIN cancelling an order the same way a seller would be rejected", () => {
    const result = canTransition("PENDING", "CANCELLED", "ADMIN");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("rejects a BUYER attempting any seller-only forward transition", () => {
    const result = canTransition("PENDING", "CONFIRMED", "BUYER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it("rejects a BUYER attempting to reject an order", () => {
    const result = canTransition("PENDING", "REJECTED", "BUYER");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });
});

describe("ORDER_STATUS_TRANSITIONS matrix", () => {
  it("defines an entry for every order status", () => {
    for (const status of ALL_STATUSES) {
      expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("has no outgoing transitions from any terminal state", () => {
    expect(ORDER_STATUS_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.REJECTED).toEqual([]);
  });
});
