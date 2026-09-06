import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { canUserReply, nextStatusOnUserReply } from "@/lib/support";

const replySchema = z.object({ message: z.string().trim().min(1).max(2000) });

export const POST = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const body = replySchema.parse(await req.json());

  await enforceRateLimit(user.id, "support_ticket_reply", { windowSeconds: 60 * 60, max: 30 });

  const ticket = await prisma.supportTicket.findFirst({ where: { id: params.id, userId: user.id } });
  if (!ticket) return jsonError("Ticket not found", 404);
  if (!canUserReply(ticket.status)) return jsonError("This ticket is closed.", 400);

  const [reply] = await prisma.$transaction([
    prisma.supportTicketReply.create({ data: { ticketId: ticket.id, authorId: user.id, message: body.message, isFromAdmin: false } }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: nextStatusOnUserReply(ticket.status) } }),
  ]);

  return NextResponse.json({ reply });
});
