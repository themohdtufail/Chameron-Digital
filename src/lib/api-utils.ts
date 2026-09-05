import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler, converting known errors into consistent JSON responses. */
export function withApiErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
) {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AuthError) return jsonError(err.message, err.status);
      if (err instanceof ZodError) {
        return jsonError(err.issues.map((i) => i.message).join(", "), 422);
      }
      // eslint-disable-next-line no-console
      console.error(err);
      return jsonError("Something went wrong", 500);
    }
  };
}
