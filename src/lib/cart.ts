import { prisma } from "@/lib/db";

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

export async function getCartDetails(userId: string) {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          store: { select: { id: true, slug: true, name: true, deliveryFee: true, deliveryAvailable: true } },
        },
      },
      variant: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const store = items[0]?.product.store ?? null;
  const lineItems = items.map((item) => {
    const unitPrice = (item.product.discountPrice ?? item.product.price) + (item.variant?.priceDelta ?? 0);
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      variantLabel: item.variant ? `${item.variant.type}: ${item.variant.value}` : null,
      imageUrl: item.product.images[0]?.url ?? null,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
      maxStock: item.variant ? item.variant.stockQuantity : item.product.stockQuantity,
      status: item.product.status,
    };
  });

  const subtotal = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = store ? store.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  return {
    cartId: cart.id,
    store: store ? { id: store.id, slug: store.slug, name: store.name, deliveryAvailable: store.deliveryAvailable } : null,
    items: lineItems,
    subtotal,
    deliveryFee,
    total,
  };
}
