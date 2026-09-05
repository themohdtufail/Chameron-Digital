import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = adminLoginSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (!user || user.role !== "ADMIN" || !user.passwordHash) {
    return jsonError("Invalid credentials", 401);
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) return jsonError("Invalid credentials", 401);

  const token = await createSession(user.id, user.role, {
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for"),
  });
  await setSessionCookie(token);

  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
});
