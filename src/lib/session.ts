// Edge-safe session token helpers (no Prisma import) — usable from
// middleware.ts as well as regular server code.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "cd_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret-change-me"
);
const EXPIRES_DAYS = Number(process.env.JWT_EXPIRES_IN_DAYS || 30);

export type SessionPayload = {
  uid: string;
  role: Role;
  sid: string;
};

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = EXPIRES_DAYS * 24 * 60 * 60;
