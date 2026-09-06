import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const filter = req.nextUrl.searchParams.get("filter") || "all";

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, variants: true },
    orderBy: { name: "asc" },
  });

  const rows = products.map((p) => {
    const totalStock = p.variants.length ? p.variants.reduce((sum, v) => sum + v.stockQuantity, 0) : p.stockQuantity;
    const isLow = p.trackInventory && totalStock > 0 && totalStock <= p.lowStockThreshold;
    const isOut = p.trackInventory && totalStock <= 0;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      imageUrl: p.images[0]?.url ?? null,
      stockQuantity: p.stockQuantity,
      lowStockThreshold: p.lowStockThreshold,
      trackInventory: p.trackInventory,
      totalStock,
      isLow,
      isOut,
      variants: p.variants.map((v) => ({ id: v.id, type: v.type, value: v.value, stockQuantity: v.stockQuantity, sku: v.sku })),
    };
  });

  const filtered = rows.filter((r) => {
    if (filter === "low") return r.isLow;
    if (filter === "out") return r.isOut;
    return true;
  });

  return NextResponse.json({
    products: filtered,
    counts: {
      total: rows.length,
      low: rows.filter((r) => r.isLow).length,
      out: rows.filter((r) => r.isOut).length,
    },
  });
});
