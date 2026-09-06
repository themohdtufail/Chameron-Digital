import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { couponSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const coupons = await prisma.coupon.findMany({
    where: { storeId: store.id },
    include: { _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ coupons });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const body = couponSchema.parse(await req.json());
  if (new Date(body.endDate) <= new Date(body.startDate)) {
    return jsonError("End date must be after the start date", 400);
  }
  if (body.type === "PERCENTAGE" && body.value > 100) {
    return jsonError("A percentage coupon cannot exceed 100%", 400);
  }

  const existing = await prisma.coupon.findUnique({ where: { storeId_code: { storeId: store.id, code: body.code } } });
  if (existing) return jsonError("You already have a coupon with this code", 409);

  const coupon = await prisma.coupon.create({
    data: {
      storeId: store.id,
      code: body.code,
      type: body.type,
      value: body.value,
      minOrderAmount: body.minOrderAmount,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      usageLimit: body.usageLimit ?? null,
    },
  });
  return NextResponse.json({ coupon });
});
