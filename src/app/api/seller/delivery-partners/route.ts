import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";

/** A seller's assignment pool: every admin-approved delivery partner —
 * platform-wide, no per-store scoping in this pass (see Phase 3 plan
 * decision #4). Busy partners (isAvailable: false) are still listed so a
 * seller can see who exists, just flagged in the UI. */
export const GET = withApiErrors(async () => {
  await requireRole("SELLER");
  const partners = await prisma.deliveryPartner.findMany({
    where: { status: "APPROVED" },
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { isAvailable: "desc" },
  });
  return NextResponse.json({ partners });
});
