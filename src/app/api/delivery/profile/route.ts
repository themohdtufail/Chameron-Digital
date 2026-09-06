import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { deliveryPartnerRegisterSchema } from "@/lib/validation";
import { z } from "zod";

export const GET = withApiErrors(async () => {
  const user = await requireRole("DELIVERY_PARTNER");
  const profile = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ profile });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const body = deliveryPartnerRegisterSchema.parse(await req.json());

  const existing = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
  if (existing) return jsonError("Delivery partner profile already exists", 409);

  const profile = await prisma.deliveryPartner.create({
    data: { userId: user.id, vehicleType: body.vehicleType },
  });
  return NextResponse.json({ profile });
});

const updateSchema = z.object({
  isAvailable: z.boolean().optional(),
  vehicleType: z.string().trim().max(40).nullable().optional(),
});

export const PATCH = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("DELIVERY_PARTNER");
  const body = updateSchema.parse(await req.json());

  const profile = await prisma.deliveryPartner.findUnique({ where: { userId: user.id } });
  if (!profile) return jsonError("Delivery partner profile not found", 404);

  const updated = await prisma.deliveryPartner.update({
    where: { userId: user.id },
    data: body,
  });
  return NextResponse.json({ profile: updated });
});
