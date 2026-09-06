import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) });

export const GET = withApiErrors(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireRole("ADMIN");
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, phone: true, role: true } },
      replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
    },
  });
  if (!ticket) return jsonError("Ticket not found", 404);
  return NextResponse.json({ ticket });
});

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = updateSchema.parse(await req.json());

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return jsonError("Ticket not found", 404);

  const updated = await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: body.status } });

  await writeAuditLog({
    actorId: admin.id,
    action: `SUPPORT_TICKET_${body.status}`,
    entityType: "SupportTicket",
    entityId: ticket.id,
  });

  return NextResponse.json({ ticket: updated });
});
