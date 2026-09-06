export interface PriceableProduct {
  price: number;
  discountPrice: number | null;
}

export interface PriceableVariant {
  priceDelta: number;
}

/** The price basis for a cart/order line: the discount price when set, plus any variant surcharge. */
export function computeUnitPrice(product: PriceableProduct, variant?: PriceableVariant | null) {
  return (product.discountPrice ?? product.price) + (variant?.priceDelta ?? 0);
}

export function computeLineTotal(product: PriceableProduct, variant: PriceableVariant | null | undefined, quantity: number) {
  return computeUnitPrice(product, variant) * quantity;
}

export interface CartLine {
  lineTotal: number;
}

export function computeCartTotals(lines: CartLine[], deliveryFee: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

/** Applied when no GLOBAL CommissionRule has been configured yet. */
export const DEFAULT_COMMISSION_PERCENTAGE = 10;

export interface CommissionRuleLike {
  scope: "GLOBAL" | "CATEGORY" | "STORE";
  storeId: string | null;
  categoryId: string | null;
  percentage: number;
}

/**
 * Pure precedence resolution — store-specific beats category beats
 * global beats the hardcoded default — so the whole priority order is
 * unit-testable without a database. Callers pass only the rules that
 * could possibly apply to this target (fetched by the impure resolver in
 * src/lib/commission.ts), not the whole table.
 */
export function resolveCommissionPercentage(
  rules: CommissionRuleLike[],
  target: { storeId: string; categoryId: string | null },
  defaultPercentage: number = DEFAULT_COMMISSION_PERCENTAGE
): number {
  const storeRule = rules.find((r) => r.scope === "STORE" && r.storeId === target.storeId);
  if (storeRule) return storeRule.percentage;

  if (target.categoryId) {
    const categoryRule = rules.find((r) => r.scope === "CATEGORY" && r.categoryId === target.categoryId);
    if (categoryRule) return categoryRule.percentage;
  }

  const globalRule = rules.find((r) => r.scope === "GLOBAL");
  if (globalRule) return globalRule.percentage;

  return defaultPercentage;
}

/** Commission is taken from the product subtotal only — delivery charges
 * pass straight through to the seller. Rounded to paise so platformFee +
 * sellerEarning always reconciles exactly against subtotal. */
export function computeCommission(subtotal: number, percentage: number) {
  const platformFee = Math.round(subtotal * (percentage / 100) * 100) / 100;
  const sellerEarning = Math.round((subtotal - platformFee) * 100) / 100;
  return { platformFee, sellerEarning };
}
