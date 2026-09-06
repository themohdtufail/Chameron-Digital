import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = adminLoginSchema.parse(await req.json());

  await enforceRateLimit(clientIp(req), "admin_login", { windowSeconds: 15 * 60, max: 8 });
  await enforceRateLimit(body.phone, "admin_login_phone", { windowSeconds: 15 * 60, max: 8 });

  const user = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (!user || user.role !== "ADMIN" || !user.passwordHash) {
    await writeAuditLog({
      actorId: null,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: body.phone,
      metadata: { reason: "unknown_account", ip: clientIp(req) },
    });
    return jsonError("Invalid credentials", 401);
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user.id,
      metadata: { reason: "wrong_password", ip: clientIp(req) },
    });
    return jsonError("Invalid credentials", 401);
  }

  const token = await createSession(user.id, user.role, {
    userAgent: req.headers.get("user-agent"),
    ip: req.headers.get("x-forwarded-for"),
  });
  await setSessionCookie(token);

  await writeAuditLog({
    actorId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role, ip: clientIp(req) },
  });

  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
});
