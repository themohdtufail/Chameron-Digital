import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productRequestSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notify";

export const GET = withApiErrors(async () => {
  const user = await requireRole("BUYER");
  const requests = await prisma.productRequest.findMany({
    where: { buyerId: user.id },
    include: {
      store: { select: { name: true, slug: true } },
      fulfilledProduct: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("BUYER");
  const body = productRequestSchema.parse(await req.json());

  await enforceRateLimit(user.id, "product_request_create", { windowSeconds: 60 * 60, max: 10 });

  let store = null;
  if (body.storeId) {
    store = await prisma.store.findUnique({ where: { id: body.storeId } });
    if (!store || store.status !== "APPROVED") return jsonError("Selected store is not available", 400);
  }

  const request = await prisma.productRequest.create({
    data: {
      buyerId: user.id,
      storeId: body.storeId,
      productName: body.productName,
      description: body.description,
      photoUrl: body.photoUrl,
      budget: body.budget,
      note: body.note,
    },
  });

  if (store) {
    await createNotification({
      userId: store.ownerId,
      type: "PRODUCT_REQUEST_RECEIVED",
      title: "New product request",
      body: `A buyer is looking for "${body.productName}".`,
      relatedProductRequestId: request.id,
    });
  }

  return NextResponse.json({ request });
});
