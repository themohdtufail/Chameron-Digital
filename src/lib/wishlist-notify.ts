import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { formatCurrency } from "@/lib/utils";

/** Notifies every buyer who has this product wishlisted exactly once at
 * the moment stock crosses 0 -> positive, mirroring notifyLowStockIfCrossed's
 * before/after comparison so it never fires on every subsequent restock. */
export async function notifyWishlistersOnRestock(input: {
  productId: string;
  productName: string;
  storeId: string;
  previousStock: number;
  newStock: number;
}) {
  if (!(input.previousStock <= 0 && input.newStock > 0)) return;

  const wishlisters = await prisma.wishlist.findMany({
    where: { productId: input.productId },
    select: { buyerId: true },
  });
  if (wishlisters.length === 0) return;

  await Promise.all(
    wishlisters.map((w) =>
      createNotification({
        userId: w.buyerId,
        type: "BACK_IN_STOCK",
        title: "Back in stock",
        body: `${input.productName} is back in stock — grab it before it's gone again!`,
        storeId: input.storeId,
      })
    )
  );
}

/** Notifies wishlisters when a product's effective (discount-aware) price
 * drops. Silent on any increase or on an unchanged price. */
export async function notifyWishlistersOnPriceDrop(input: {
  productId: string;
  productName: string;
  storeId: string;
  previousPrice: number;
  newPrice: number;
}) {
  if (input.newPrice >= input.previousPrice) return;

  const wishlisters = await prisma.wishlist.findMany({
    where: { productId: input.productId },
    select: { buyerId: true },
  });
  if (wishlisters.length === 0) return;

  await Promise.all(
    wishlisters.map((w) =>
      createNotification({
        userId: w.buyerId,
        type: "PRICE_DROP",
        title: "Price drop",
        body: `${input.productName} just dropped to ${formatCurrency(input.newPrice)} (was ${formatCurrency(input.previousPrice)}).`,
        storeId: input.storeId,
      })
    )
  );
}
