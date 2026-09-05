import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";
import type { Role } from "@prisma/client";

export { SESSION_COOKIE };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a DB-tracked session and returns the signed JWT to set as a cookie. */
export async function createSession(
  userId: string,
  role: Role,
  meta?: { userAgent?: string | null; ip?: string | null }
) {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      userAgent: meta?.userAgent ?? undefined,
      ip: meta?.ip ?? undefined,
      expiresAt,
    },
  });
  return signSessionToken({ uid: userId, role, sid: session.id });
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { store: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Not authenticated", 401);
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) throw new AuthError("Forbidden", 403);
  return user;
}

export async function revokeCurrentSession() {
  const session = await getCurrentSession();
  if (!session) return;
  await prisma.session
    .update({ where: { id: session.sid }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
