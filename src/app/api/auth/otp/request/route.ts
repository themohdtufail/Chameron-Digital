import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requestOtp } from "@/lib/otp";
import { otpRequestSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = otpRequestSchema.parse(await req.json());

  await enforceRateLimit(body.phone, "otp_request", { windowSeconds: 15 * 60, max: 5 });
  await enforceRateLimit(clientIp(req), "otp_request_ip", { windowSeconds: 15 * 60, max: 20 });

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
