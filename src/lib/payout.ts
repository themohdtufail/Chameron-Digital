export type PayoutStatusValue = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "ON_HOLD";

export interface PayoutLike {
  amount: number;
  status: PayoutStatusValue;
}

/** Only a PAID payout has actually moved money — PENDING/PROCESSING/ON_HOLD
 * records don't reduce what's still owed, FAILED never landed. */
export function computePaidOutAmount(payouts: PayoutLike[]): number {
  return payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0);
}

/** What a store is still owed: lifetime seller earnings minus what's already
 * been paid out, never negative. */
export function computeOutstandingBalance(totalEarned: number, payouts: PayoutLike[]): number {
  return Math.max(0, totalEarned - computePaidOutAmount(payouts));
}
