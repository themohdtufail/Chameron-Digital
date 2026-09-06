import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { couponUpdateSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const coupon = await prisma.coupon.findFirst({ where: { id: params.id, storeId: store.id } });
  if (!coupon) return jsonError("Coupon not found", 404);

  const body = couponUpdateSchema.parse(await req.json());
  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: {
      isActive: body.isActive,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      usageLimit: body.usageLimit,
    },
  });
  return NextResponse.json({ coupon: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const coupon = await prisma.coupon.findFirst({ where: { id: params.id, storeId: store.id } });
  if (!coupon) return jsonError("Coupon not found", 404);

  await prisma.coupon.delete({ where: { id: coupon.id } });
  return NextResponse.json({ success: true });
});
