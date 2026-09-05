import { NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

export const POST = withApiErrors(async () => {
  await revokeCurrentSession();
  await clearSessionCookie();
  return NextResponse.json({ success: true });
});
