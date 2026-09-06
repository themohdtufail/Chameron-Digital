export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED";

export type OrderActor = "BUYER" | "SELLER" | "ADMIN" | "DELIVERY_PARTNER";

/**
 * Seller/admin-driven forward path through the order lifecycle. READY can
 * go either to PICKED_UP (a delivery partner is fulfilling the order) or
 * straight to OUT_FOR_DELIVERY (self-fulfillment, unchanged from before
 * delivery partners existed) — both stay valid so existing sellers with no
 * partner are unaffected.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED"],
  CONFIRMED: ["PREPARING", "REJECTED"],
  PREPARING: ["READY"],
  READY: ["PICKED_UP", "OUT_FOR_DELIVERY"],
  PICKED_UP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * A delivery partner may only advance an order once it's been handed to
 * them, and only through the delivery leg — never the seller's prep steps
 * or the buyer-only cancellation path. Route handlers additionally check
 * that the order is assigned to the acting partner (not expressible here,
 * since this function has no DB access).
 */
const DELIVERY_PARTNER_ALLOWED_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PICKED_UP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

// A buyer can still back out through CONFIRMED (before the seller has started
// preparing it); once PREPARING begins, only the forward path or a
// seller-initiated REJECTED applies.
export const BUYER_CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
  /** HTTP status a route should map a rejection to: 403 for an authorization
   * failure, 400 for a state-machine violation by someone who is allowed to
   * act on the order at all. Absent when allowed is true. */
  status?: 403 | 400;
}

/**
 * Pure authorization + state-machine check for an order status transition —
 * no I/O, so the full valid/invalid transition matrix is unit-testable
 * without a database. Route handlers own applying the result.
 */
export function canTransition(current: OrderStatus, next: OrderStatus, actor: OrderActor): TransitionCheck {
  if (next === "CANCELLED") {
    if (actor !== "BUYER") return { allowed: false, reason: "Only the buyer can cancel an order", status: 403 };
    if (!BUYER_CANCELLABLE_STATUSES.includes(current)) {
      return { allowed: false, reason: "This order can no longer be cancelled", status: 400 };
    }
    return { allowed: true };
  }

  if (actor === "BUYER") {
    return { allowed: false, reason: "Forbidden", status: 403 };
  }

  if (actor === "DELIVERY_PARTNER") {
    const allowed = DELIVERY_PARTNER_ALLOWED_NEXT[current] ?? [];
    if (!allowed.includes(next)) {
      return { allowed: false, reason: `Delivery partners cannot move an order from ${current} to ${next}`, status: 400 };
    }
    return { allowed: true };
  }

  if (next === "REJECTED") {
    if (!ORDER_STATUS_TRANSITIONS[current]?.includes("REJECTED")) {
      return { allowed: false, reason: "This order can no longer be rejected", status: 400 };
    }
    return { allowed: true };
  }

  const allowed = ORDER_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    return { allowed: false, reason: `Cannot move order from ${current} to ${next}`, status: 400 };
  }
  return { allowed: true };
}
