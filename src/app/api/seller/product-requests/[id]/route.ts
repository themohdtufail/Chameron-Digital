import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { productRequestRespondSchema } from "@/lib/validation";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { createNotification } from "@/lib/notify";

export const PATCH = withApiErrors(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const request = await prisma.productRequest.findFirst({ where: { id: params.id, storeId: store.id } });
  if (!request) return jsonError("Request not found", 404);

  const body = productRequestRespondSchema.parse(await req.json());

  if (body.fulfilledProductId) {
    const product = await prisma.product.findFirst({ where: { id: body.fulfilledProductId, storeId: store.id } });
    if (!product) return jsonError("That product does not belong to your store", 400);
  }

  const updated = await prisma.productRequest.update({
    where: { id: request.id },
    data: {
      sellerAvailable: body.sellerAvailable,
      sellerPrice: body.sellerPrice,
      sellerMessage: body.sellerMessage,
      fulfilledProductId: body.fulfilledProductId,
      status: "RESPONDED",
      respondedAt: new Date(),
    },
  });

  await createNotification({
    userId: request.buyerId,
    type: "PRODUCT_REQUEST_RESPONSE",
    title: body.sellerAvailable ? "A seller responded to your request" : "Update on your product request",
    body: body.sellerAvailable
      ? `${store.name} can fulfill "${request.productName}". Check the details.`
      : `${store.name} isn't able to fulfill "${request.productName}" right now.`,
    relatedProductRequestId: request.id,
  });

  return NextResponse.json({ request: updated });
});
