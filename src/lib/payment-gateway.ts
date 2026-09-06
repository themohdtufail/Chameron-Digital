export type GatewayOutcome = "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT";

export interface PaymentIntent {
  gatewayRef: string;
}

export interface PaymentGateway {
  /** Starts a payment for an order; returns a reference to verify later. */
  createIntent(orderId: string, amount: number): Promise<PaymentIntent>;
  /**
   * Resolves the outcome for a previously created intent. Real gateways
   * resolve this from their own server-to-server state; the mock gateway
   * accepts an optional `simulate` hint so the checkout UI can exercise
   * every outcome without external infrastructure.
   */
  verify(gatewayRef: string, simulate?: GatewayOutcome): Promise<{ outcome: GatewayOutcome; failureReason?: string }>;
}

/**
 * Deterministic, no-network gateway used until a real provider (Razorpay,
 * Stripe, etc.) is configured — same seam shape as StorageDriver/OtpCode's
 * dev mode, so swapping in a real gateway later is a new class + env var
 * selected in getPaymentGateway(), not a rewrite of any call site.
 */
class MockPaymentGateway implements PaymentGateway {
  async createIntent(orderId: string): Promise<PaymentIntent> {
    return { gatewayRef: `mock_${orderId}` };
  }

  async verify(_gatewayRef: string, simulate?: GatewayOutcome) {
    const outcome = simulate ?? "SUCCESS";
    if (outcome === "SUCCESS") return { outcome };
    const failureReason =
      outcome === "FAILED"
        ? "Payment declined by issuer (simulated)"
        : outcome === "CANCELLED"
          ? "Payment cancelled by customer"
          : "Payment timed out";
    return { outcome, failureReason };
  }
}

let gateway: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (gateway) return gateway;
  // PAYMENT_GATEWAY=razorpay|stripe would select a real driver here once
  // credentials exist; only "mock" is implemented today.
  gateway = new MockPaymentGateway();
  return gateway;
}
