import { describe, it, expect } from "vitest";
import { getPaymentGateway } from "@/lib/payment-gateway";

describe("MockPaymentGateway", () => {
  it("creates a deterministic intent reference for a given order", async () => {
    const gateway = getPaymentGateway();
    const intent = await gateway.createIntent("order_123", 500);
    expect(intent.gatewayRef).toBe("mock_order_123");
  });

  it("defaults to a SUCCESS outcome when no simulation hint is given", async () => {
    const gateway = getPaymentGateway();
    const result = await gateway.verify("mock_order_123");
    expect(result.outcome).toBe("SUCCESS");
    expect(result.failureReason).toBeUndefined();
  });

  it("honors a simulate hint for every non-success outcome", async () => {
    const gateway = getPaymentGateway();
    for (const outcome of ["FAILED", "CANCELLED", "TIMEOUT"] as const) {
      const result = await gateway.verify("mock_order_123", outcome);
      expect(result.outcome).toBe(outcome);
      expect(result.failureReason).toBeTruthy();
    }
  });

  it("is idempotent — repeated verify calls with the same hint return the same outcome", async () => {
    const gateway = getPaymentGateway();
    const first = await gateway.verify("mock_order_123", "SUCCESS");
    const second = await gateway.verify("mock_order_123", "SUCCESS");
    expect(first).toEqual(second);
  });
});
