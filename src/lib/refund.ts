export type RefundStatusValue = "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface RefundLike {
  amount: number;
  status: RefundStatusValue;
}

/** Only COMPLETED refunds actually reduce what's owed back — a REQUESTED or
 * FAILED one never touched real money. */
export function computeRefundedAmount(refunds: RefundLike[]): number {
  return refunds.filter((r) => r.status === "COMPLETED").reduce((sum, r) => sum + r.amount, 0);
}

/** What's left that could still be refunded on this payment, never negative. */
export function computeRefundableBalance(paymentAmount: number, refunds: RefundLike[]): number {
  return Math.max(0, paymentAmount - computeRefundedAmount(refunds));
}

/** The Payment.status a payment should carry once a refund completes —
 * REFUNDED once the full amount has come back, PARTIALLY_REFUNDED otherwise. */
export function resolvePaymentStatusAfterRefund(
  paymentAmount: number,
  refunds: RefundLike[]
): "REFUNDED" | "PARTIALLY_REFUNDED" {
  return computeRefundedAmount(refunds) >= paymentAmount ? "REFUNDED" : "PARTIALLY_REFUNDED";
}
