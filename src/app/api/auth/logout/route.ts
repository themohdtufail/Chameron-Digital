import { NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession, getCurrentSession } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

export const POST = withApiErrors(async () => {
  const session = await getCurrentSession();
  await revokeCurrentSession();
  await clearSessionCookie();

  if (session) {
    await writeAuditLog({ actorId: session.uid, action: "LOGOUT", entityType: "User", entityId: session.uid });
  }

  return NextResponse.json({ success: true });
});
