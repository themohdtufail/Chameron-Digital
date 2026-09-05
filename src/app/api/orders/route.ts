import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { generateOrderNumber } from "@/lib/utils";

const checkoutSchema = z.object({
  addressId: z.string(),
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(10).max(15),
  notes: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(["COD", "ONLINE"]).default("COD"),
});

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

  if (body.paymentMethod === "ONLINE") {
    return jsonError("Online payment is coming soon. Please choose Cash on Delivery.", 400);
  }

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
    const stock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
    if (stock < item.quantity) {
      return jsonError(`Not enough stock for ${item.product.name}`, 400);
    }
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const unitPrice = (item.product.discountPrice ?? item.product.price) + (item.variant?.priceDelta ?? 0);
    return sum + unitPrice * item.quantity;
  }, 0);
  const deliveryFee = store.deliveryFee;
  const total = subtotal + deliveryFee;

  const addressSnapshot = [address.addressLine, address.landmark, address.area, address.city, address.state]
    .filter(Boolean)
    .join(", ");

  const order = await prisma.$transaction(async (tx) => {
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
        total,
        items: {
          create: cartItems.map((item) => {
            const unitPrice = (item.product.discountPrice ?? item.product.price) + (item.variant?.priceDelta ?? 0);
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

    for (const item of cartItems) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return created;
  });

  return NextResponse.json({ order });
});
