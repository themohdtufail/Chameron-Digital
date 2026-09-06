import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const documents = await prisma.storeDocument.findMany({
    where: { storeId: store.id },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json({ documents });
});

const createSchema = z.object({
  type: z.enum(["SHOP_PROOF", "GST", "FSSAI", "BUSINESS_CERTIFICATE"]),
  url: z.string().trim().min(1),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const body = createSchema.parse(await req.json());

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const document = await prisma.storeDocument.create({
    data: { storeId: store.id, type: body.type, url: body.url },
  });
  return NextResponse.json({ document });
});
