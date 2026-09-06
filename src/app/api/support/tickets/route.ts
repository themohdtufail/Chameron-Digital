import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withApiErrors } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  category: z.enum(["ORDER", "PAYMENT", "ACCOUNT", "PRODUCT", "OTHER"]).default("OTHER"),
  message: z.string().trim().min(5).max(2000),
  relatedOrderId: z.string().trim().optional(),
});

export const GET = withApiErrors(async () => {
  const user = await requireUser();
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { replies: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json({ tickets });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireUser();
  const body = createSchema.parse(await req.json());

  await enforceRateLimit(user.id, "support_ticket_create", { windowSeconds: 60 * 60, max: 10 });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: body.subject,
      category: body.category,
      relatedOrderId: body.relatedOrderId,
      replies: { create: { authorId: user.id, message: body.message, isFromAdmin: false } },
    },
    include: { replies: true },
  });

  return NextResponse.json({ ticket });
});
