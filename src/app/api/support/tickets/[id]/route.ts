import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, userId: user.id },
    include: { replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } },
  });
  if (!ticket) return jsonError("Ticket not found", 404);
  return NextResponse.json({ ticket });
});
