import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import type { SupportTicketStatus } from "@prisma/client";

export const GET = withApiErrors(async (req: NextRequest) => {
  await requireRole("ADMIN");
  const status = req.nextUrl.searchParams.get("status") as SupportTicketStatus | null;

  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { name: true, phone: true, role: true } },
      replies: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 200,
  });

  return NextResponse.json({ tickets });
});
