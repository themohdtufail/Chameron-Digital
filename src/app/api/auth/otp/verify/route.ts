import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { createSession, setSessionCookie } from "@/lib/auth";
import { otpVerifySchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = otpVerifySchema.parse(await req.json());

  const result = await verifyOtp(body.phone, "LOGIN", body.code);
  if (!result.success) return jsonError(result.reason, 400);

  let user = await prisma.user.findUnique({ where: { phone: body.phone }, include: { store: true } });

  if (user && user.role !== body.role) {
    return jsonError(
      `This number is already registered as a ${user.role.toLowerCase()}.`,
      409
    );
  }

  if (!user) {
    if (!body.name) return jsonError("Name is required for new accounts", 422);
    user = await prisma.user.create({
      data: {
        phone: body.phone,
        role: body.role,
        name: body.name,
        email: body.email || undefined,
      },
      include: { store: true },
    });
    if (body.role === "BUYER") {
      await prisma.cart.create({ data: { userId: user.id } });
    }
  }

  const token = await createSession(user.id, user.role, {
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for"),
  });
  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      hasStore: Boolean(user.store),
      storeStatus: user.store?.status ?? null,
    },
  });
});
