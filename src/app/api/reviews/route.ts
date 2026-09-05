import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const reviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const GET = withApiErrors(async (req: NextRequest) => {
  const storeId = req.nextUrl.searchParams.get("storeId") || undefined;
  const productId = req.nextUrl.searchParams.get("productId") || undefined;
  const reviews = await prisma.review.findMany({
    where: { storeId, productId },
    include: { buyer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ reviews });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("BUYER");
  const body = reviewSchema.parse(await req.json());

  const order = await prisma.order.findFirst({ where: { id: body.orderId, buyerId: user.id } });
  if (!order) return jsonError("Order not found", 404);
  if (order.status !== "COMPLETED") return jsonError("You can only review completed orders", 400);

  const existing = await prisma.review.findFirst({ where: { buyerId: user.id, storeId: order.storeId } });
  if (existing) return jsonError("You've already reviewed this store", 409);

  await prisma.review.create({
    data: { buyerId: user.id, storeId: order.storeId, rating: body.rating, comment: body.comment },
  });

  const agg = await prisma.review.aggregate({ where: { storeId: order.storeId }, _avg: { rating: true }, _count: true });
  await prisma.store.update({
    where: { id: order.storeId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
  });

  return NextResponse.json({ success: true });
});
