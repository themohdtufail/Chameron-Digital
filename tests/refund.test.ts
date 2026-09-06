import { describe, it, expect } from "vitest";
import { computeRefundedAmount, computeRefundableBalance, resolvePaymentStatusAfterRefund } from "@/lib/refund";

describe("computeRefundedAmount", () => {
  it("sums only COMPLETED refunds", () => {
    const refunds = [
      { amount: 100, status: "COMPLETED" as const },
      { amount: 50, status: "REQUESTED" as const },
      { amount: 30, status: "FAILED" as const },
    ];
    expect(computeRefundedAmount(refunds)).toBe(100);
  });

  it("is zero with no refunds", () => {
    expect(computeRefundedAmount([])).toBe(0);
  });
});

describe("computeRefundableBalance", () => {
  it("subtracts completed refunds from the payment amount", () => {
    const refunds = [{ amount: 300, status: "COMPLETED" as const }];
    expect(computeRefundableBalance(1000, refunds)).toBe(700);
  });

  it("never goes negative even if refunds somehow exceed the payment", () => {
    const refunds = [{ amount: 1200, status: "COMPLETED" as const }];
    expect(computeRefundableBalance(1000, refunds)).toBe(0);
  });
});

describe("resolvePaymentStatusAfterRefund", () => {
  it("is PARTIALLY_REFUNDED when some but not all of the payment has come back", () => {
    const refunds = [{ amount: 400, status: "COMPLETED" as const }];
    expect(resolvePaymentStatusAfterRefund(1000, refunds)).toBe("PARTIALLY_REFUNDED");
  });

  it("is REFUNDED once completed refunds cover the full amount", () => {
    const refunds = [
      { amount: 400, status: "COMPLETED" as const },
      { amount: 600, status: "COMPLETED" as const },
    ];
    expect(resolvePaymentStatusAfterRefund(1000, refunds)).toBe("REFUNDED");
  });
});
