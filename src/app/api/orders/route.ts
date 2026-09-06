import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { generateOrderNumber, formatCurrency } from "@/lib/utils";
import { computeUnitPrice, computeCartTotals, computeCommission } from "@/lib/pricing";
import { resolveCommissionForStore } from "@/lib/commission";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createNotification, notifyLowStockIfCrossed } from "@/lib/notify";
import { getPaymentGateway } from "@/lib/payment-gateway";
import { computeRedemptionDiscount, redeemLoyaltyPoints } from "@/lib/loyalty";
import { validateCoupon, computeCouponDiscount } from "@/lib/coupon";

const checkoutSchema = z.object({
  addressId: z.string(),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(10).max(15),
  notes: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(["COD", "ONLINE"]).default("COD"),
  redeemPoints: z.number().int().min(0).max(100000).default(0),
  couponCode: z.string().trim().toUpperCase().optional(),
});

class OutOfStockError extends Error {}

export const GET = withApiErrors(async () => {
  const user = await requireRole("BUYER");
  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    include: { store: { select: { name: true, logoUrl: true, slug: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("BUYER");
  const body = checkoutSchema.parse(await req.json());

  await enforceRateLimit(user.id, "order_create", { windowSeconds: 60 * 60, max: 20 });

  const address = await prisma.location.findFirst({ where: { id: body.addressId, userId: user.id } });
  if (!address) return jsonError("Delivery address not found", 404);

  const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
  if (!cart) return jsonError("Your cart is empty", 400);

  const cartItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: { store: true } }, variant: true },
  });
  if (cartItems.length === 0) return jsonError("Your cart is empty", 400);

  const store = cartItems[0].product.store;
  if (store.status !== "APPROVED") return jsonError("This store is currently unavailable", 400);

  for (const item of cartItems) {
    if (item.product.status !== "AVAILABLE") {
      return jsonError(`${item.product.name} is no longer available`, 400);
    }
    if (!item.product.trackInventory) continue;
    const stock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
    if (stock < item.quantity) {
      return jsonError(`Not enough stock for ${item.product.name}`, 400);
    }
  }

  const { subtotal, deliveryFee, total: preDiscountTotal } = computeCartTotals(
    cartItems.map((item) => ({ lineTotal: computeUnitPrice(item.product, item.variant) * item.quantity })),
    store.deliveryFee
  );

  // Coupon is applied first (on the full subtotal), loyalty redemption
  // second (on whatever remains) — both are capped so the order can never
  // go to ₹0 or negative. Never trust a client-supplied discount: the
  // coupon is re-validated here from scratch even if the checkout UI
  // already showed a preview via /api/coupons/validate.
  let couponDiscount = 0;
  let appliedCoupon: { id: string; code: string } | null = null;
  if (body.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { storeId_code: { storeId: store.id, code: body.couponCode } } });
    if (!coupon) return jsonError("Invalid coupon code", 400);

    const [usageCount, ownRedemption] = await Promise.all([
      prisma.couponRedemption.count({ where: { couponId: coupon.id } }),
      prisma.couponRedemption.findUnique({ where: { couponId_buyerId: { couponId: coupon.id, buyerId: user.id } } }),
    ]);
    const check = validateCoupon(coupon, {
      subtotal,
      now: new Date(),
      usageCount,
      alreadyRedeemedByBuyer: Boolean(ownRedemption),
    });
    if (!check.valid) return jsonError(check.reason ?? "This coupon cannot be applied", 400);

    couponDiscount = computeCouponDiscount(coupon, subtotal);
    appliedCoupon = { id: coupon.id, code: coupon.code };
  }

  // Redeeming is capped by both the buyer's balance and what's left after
  // the coupon discount. Both discounts come out of the platform's own
  // margin, not the seller's, so commission/sellerEarning below are
  // computed on the undiscounted subtotal.
  let redeemPoints = 0;
  let loyaltyDiscount = 0;
  if (body.redeemPoints > 0) {
    const loyaltyAccount = await prisma.loyaltyAccount.findUnique({ where: { userId: user.id } });
    const balance = loyaltyAccount?.pointsBalance ?? 0;
    redeemPoints = Math.min(body.redeemPoints, balance);
    loyaltyDiscount = computeRedemptionDiscount(redeemPoints, subtotal - couponDiscount);
  }
  const discountAmount = couponDiscount + loyaltyDiscount;
  const total = preDiscountTotal - discountAmount;

  const commissionPercentage = await resolveCommissionForStore(store.id, store.categoryId);
  const { platformFee, sellerEarning: subtotalEarning } = computeCommission(subtotal, commissionPercentage);
  const sellerEarning = subtotalEarning + deliveryFee;

  const addressSnapshot = [
    address.addressLine,
    address.landmark,
    address.area,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: user.id,
          storeId: store.id,
          addressId: address.id,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          addressSnapshot: addressSnapshot || `${address.city}`,
          paymentMethod: body.paymentMethod,
          notes: body.notes,
          subtotal,
          deliveryFee,
          discountAmount,
          loyaltyPointsRedeemed: redeemPoints,
          couponCode: appliedCoupon?.code,
          total,
          platformFee,
          sellerEarning,
          items: {
            create: cartItems.map((item) => {
              const unitPrice = computeUnitPrice(item.product, item.variant);
              return {
                productId: item.productId,
                variantId: item.variantId,
                productName: item.product.name,
                variantLabel: item.variant ? `${item.variant.type}: ${item.variant.value}` : null,
                price: unitPrice,
                quantity: item.quantity,
                lineTotal: unitPrice * item.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      let gatewayRef: string | null = null;
      if (body.paymentMethod === "ONLINE") {
        const intent = await getPaymentGateway().createIntent(created.id, total);
        gatewayRef = intent.gatewayRef;
      }
      await tx.payment.create({
        data: {
          orderId: created.id,
          method: body.paymentMethod,
          amount: total,
          gateway: body.paymentMethod === "ONLINE" ? "mock" : null,
          gatewayRef,
        },
      });

      if (appliedCoupon) {
        // A conditional create would race the same way stock does, but a
        // buyer can only ever be mid-checkout once for their own cart, and
        // @@unique([couponId, buyerId]) still rejects a genuine duplicate.
        await tx.couponRedemption.create({
          data: { couponId: appliedCoupon.id, buyerId: user.id, orderId: created.id, discountAmount: couponDiscount },
        });
      }

      for (const item of cartItems) {
        if (!item.product.trackInventory) continue;

        // A conditional decrement (stock >= qty in the WHERE clause) closes the
        // race two simultaneous checkouts could hit on the last unit: the
        // pre-check above reads a snapshot, but only this row-level guard,
        // enforced by the database itself, is safe under concurrency.
        if (item.variantId) {
          const result = await tx.productVariant.updateMany({
            where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) throw new OutOfStockError(item.product.name);
        } else {
          const result = await tx.product.updateMany({
            where: { id: item.productId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (result.count === 0) throw new OutOfStockError(item.product.name);
        }

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            change: -item.quantity,
            reason: "ORDER",
            orderId: created.id,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: { items: true, payment: true } });
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return jsonError(`${err.message} just sold out. Please update your cart.`, 409);
    }
    throw err;
  }

  if (redeemPoints > 0) {
    await redeemLoyaltyPoints(user.id, order.id, redeemPoints);
  }

  await createNotification({
    userId: store.ownerId,
    type: "NEW_ORDER",
    title: "New order received",
    body: `${body.customerName} placed order ${order.orderNumber} for ${formatCurrency(order.total)}.`,
    relatedOrderId: order.id,
    templateKey: "new_order",
    vars: { orderNumber: order.orderNumber, customerName: body.customerName, amount: formatCurrency(order.total) },
    storeId: store.id,
  });

  await createNotification({
    userId: user.id,
    type: "ORDER_PLACED",
    title: "Order placed",
    body: `Your order ${order.orderNumber} from ${store.name} has been placed for ${formatCurrency(order.total)}.`,
    relatedOrderId: order.id,
    templateKey: "order_placed",
    vars: { orderNumber: order.orderNumber, storeName: store.name, amount: formatCurrency(order.total) },
    storeId: store.id,
  });

  for (const item of cartItems) {
    if (item.variantId || !item.product.trackInventory) continue;
    await notifyLowStockIfCrossed({
      storeOwnerId: store.ownerId,
      storeId: store.id,
      productId: item.productId,
      productName: item.product.name,
      previousStock: item.product.stockQuantity,
      newStock: item.product.stockQuantity - item.quantity,
      threshold: item.product.lowStockThreshold,
    });
  }

  return NextResponse.json({ order });
});
