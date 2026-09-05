import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requestOtp } from "@/lib/otp";
import { otpRequestSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = otpRequestSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (existing && existing.role !== body.role) {
    return jsonError(
      `This number is already registered as a ${existing.role.toLowerCase()}. Please continue from that experience instead.`,
      409
    );
  }

  const result = await requestOtp(body.phone, "LOGIN");
  return NextResponse.json({
    success: true,
    isNewUser: !existing,
    expiresInMinutes: result.expiresInMinutes,
    devCode: result.devCode,
  });
});
