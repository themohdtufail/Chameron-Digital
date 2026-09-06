import { prisma } from "@/lib/db";

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many requests. Please try again later.");
  }
}

interface RateLimitOptions {
  /** Fixed window size, in seconds. */
  windowSeconds: number;
  /** Max hits allowed within one window. */
  max: number;
}

/**
 * DB-backed fixed-window rate limiter. Serverless invocations don't share
 * process memory, so an in-memory counter would reset every cold start —
 * this uses the RateLimitHit table instead, keyed by a rounded window
 * start so concurrent requests in the same window share one row.
 *
 * Throws RateLimitError when the caller should be rejected; callers should
 * let withApiErrors (src/lib/api-utils.ts) turn that into a 429 response.
 */
export async function enforceRateLimit(identifier: string, action: string, options: RateLimitOptions) {
  const windowMs = options.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  const hit = await prisma.rateLimitHit.upsert({
    where: { identifier_action_windowStart: { identifier, action, windowStart } },
    update: { count: { increment: 1 } },
    create: { identifier, action, windowStart, count: 1 },
  });

  if (hit.count > options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000));
    throw new RateLimitError(retryAfterSeconds);
  }
}

/** Best-effort client IP from standard proxy headers; falls back to "unknown". */
export function clientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
