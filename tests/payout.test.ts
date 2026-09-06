import { describe, it, expect } from "vitest";
import { computePaidOutAmount, computeOutstandingBalance } from "@/lib/payout";

describe("computePaidOutAmount", () => {
  it("sums only PAID payouts", () => {
    const payouts = [
      { amount: 500, status: "PAID" as const },
      { amount: 200, status: "PENDING" as const },
      { amount: 100, status: "FAILED" as const },
    ];
    expect(computePaidOutAmount(payouts)).toBe(500);
  });
});

describe("computeOutstandingBalance", () => {
  it("subtracts what's already been paid out from total earnings", () => {
    const payouts = [{ amount: 3000, status: "PAID" as const }];
    expect(computeOutstandingBalance(10000, payouts)).toBe(7000);
  });

  it("never goes negative", () => {
    const payouts = [{ amount: 15000, status: "PAID" as const }];
    expect(computeOutstandingBalance(10000, payouts)).toBe(0);
  });

  it("is the full amount when nothing has been paid yet", () => {
    expect(computeOutstandingBalance(5000, [])).toBe(5000);
  });
});
