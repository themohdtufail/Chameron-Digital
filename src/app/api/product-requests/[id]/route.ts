import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productRequestDecisionSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("BUYER");
  const request = await prisma.productRequest.findFirst({ where: { id: params.id, buyerId: user.id } });
  if (!request) return jsonError("Request not found", 404);
  if (request.status !== "RESPONDED") return jsonError("This request isn't awaiting your decision", 400);

  const { decision } = productRequestDecisionSchema.parse(await req.json());

  const updated = await prisma.productRequest.update({
    where: { id: request.id },
    data: { status: decision },
    include: { fulfilledProduct: { select: { id: true, name: true, slug: true } } },
  });

  return NextResponse.json({ request: updated });
});
