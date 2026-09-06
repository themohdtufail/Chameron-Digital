import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { RateLimitError } from "@/lib/rate-limit";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Minimal shape we rely on — avoids an `instanceof NextRequest` check, which
 * can fail across bundling boundaries where more than one copy of the
 * NextRequest class ends up loaded. */
interface RequestLike {
  method: string;
  headers: { get(name: string): string | null };
  url: string;
}

function isRequestLike(value: unknown): value is RequestLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RequestLike).method === "string" &&
    typeof (value as RequestLike).url === "string" &&
    typeof (value as RequestLike).headers?.get === "function"
  );
}

/**
 * Defense-in-depth CSRF check: a cross-site request can't set a custom
 * Origin, so a mismatched one is always suspicious. Session cookies are
 * already SameSite=Lax (the primary defense) — a missing Origin header
 * (some same-origin requests, non-browser clients) is allowed through.
 */
function hasSafeOrigin(req: RequestLike) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** Wraps a route handler, converting known errors into consistent JSON responses. */
export function withApiErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      const req = args[0];
      if (isRequestLike(req) && MUTATING_METHODS.has(req.method) && !hasSafeOrigin(req)) {
        return jsonError("Cross-origin request blocked", 403);
      }
      return await handler(...args);
    } catch (err) {
      if (err instanceof AuthError) return jsonError(err.message, err.status);
      if (err instanceof ZodError) {
        return jsonError(err.issues.map((i) => i.message).join(", "), 422);
      }
      if (err instanceof RateLimitError) {
        return NextResponse.json(
          { error: err.message },
          { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } }
        );
      }
      // eslint-disable-next-line no-console
      console.error(err);
      return jsonError("Something went wrong", 500);
    }
  };
}
