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
