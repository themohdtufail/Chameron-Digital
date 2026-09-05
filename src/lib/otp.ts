import "server-only";
import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/db";
import type { OtpPurpose } from "@prisma/client";

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const isDevMode = process.env.OTP_DEV_MODE === "true";
const DEV_STATIC_CODE = process.env.OTP_DEV_STATIC_CODE || "123456";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  if (isDevMode) return DEV_STATIC_CODE;
  return String(randomInt(100000, 999999));
}

/**
 * Requests an OTP for a phone number. In dev mode the code is fixed and
 * logged to the console instead of being sent via a real SMS provider,
 * so the flow is fully testable without external services.
 */
export async function requestOtp(phone: string, purpose: OtpPurpose) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { phone, codeHash: hashCode(code), purpose, expiresAt },
  });

  if (isDevMode) {
    // eslint-disable-next-line no-console
    console.log(`[OTP][DEV] ${purpose} code for ${phone}: ${code}`);
  } else {
    // TODO: integrate a real SMS provider (Twilio / MSG91 / etc.) here.
    // eslint-disable-next-line no-console
    console.log(`[OTP] Would send SMS to ${phone}`);
  }

  return { expiresInMinutes: OTP_TTL_MINUTES, devCode: isDevMode ? code : undefined };
}

export async function verifyOtp(phone: string, purpose: OtpPurpose, code: string) {
  const record = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { success: false, reason: "No OTP requested" as const };
  if (record.expiresAt < new Date()) return { success: false, reason: "OTP expired" as const };
  if (record.attempts >= MAX_ATTEMPTS)
    return { success: false, reason: "Too many attempts" as const };

  const valid = record.codeHash === hashCode(code);

  if (!valid) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { success: false, reason: "Incorrect code" as const };
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
  return { success: true as const };
}
