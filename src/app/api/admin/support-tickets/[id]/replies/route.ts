import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";
import { nextStatusOnAdminReply } from "@/lib/support";

const replySchema = z.object({ message: z.string().trim().min(1).max(2000) });

export const POST = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const admin = await requireRole("ADMIN");
  const body = replySchema.parse(await req.json());

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } });
  if (!ticket) return jsonError("Ticket not found", 404);

  const [reply] = await prisma.$transaction([
    prisma.supportTicketReply.create({ data: { ticketId: ticket.id, authorId: admin.id, message: body.message, isFromAdmin: true } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: nextStatusOnAdminReply(ticket.status) } }),
  ]);

  await createNotification({
    userId: ticket.userId,
    type: "SUPPORT_TICKET_REPLY",
    title: "Support replied to your ticket",
    body: `"${ticket.subject}": ${body.message.slice(0, 140)}`,
  });

  return NextResponse.json({ reply });
});
