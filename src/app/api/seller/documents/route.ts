import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { getStorage } from "@/lib/storage";

export const GET = withApiErrors(async () => {
  const user = await requireRole("SELLER");
  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  const documents = await prisma.storeDocument.findMany({
    where: { storeId: store.id },
    orderBy: { uploadedAt: "desc" },
  });

  // Never return the raw stored reference: for S3 it's a private object key
  // that isn't renderable on its own, and even for local dev it shouldn't
  // be treated as a stable link. Each document gets a freshly-generated,
  // short-lived signed URL instead, resolved only now that ownership has
  // already been checked above.
  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      type: doc.type,
      uploadedAt: doc.uploadedAt,
      url: await getStorage().getSignedUrl(doc.key, "documents"),
    }))
  );

  return NextResponse.json({ documents: withUrls });
});

const createSchema = z.object({
  type: z.enum(["SHOP_PROOF", "GST", "FSSAI", "BUSINESS_CERTIFICATE"]),
  key: z.string().trim().min(1),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireRole("SELLER");
  const body = createSchema.parse(await req.json());

  const store = await prisma.store.findUnique({ where: { ownerId: user.id } });
  if (!store) return jsonError("Store not found", 404);

  // Reject anything that isn't a reference this store's own /api/upload
  // call could have produced — never an attacker-controlled external URL,
  // and never another store's own real object key.
  if (!getStorage().isOwnReference(body.key, "documents", store.id)) {
    return jsonError("Invalid document reference", 400);
  }

  const document = await prisma.storeDocument.create({
    data: { storeId: store.id, type: body.type, key: body.key },
  });
  return NextResponse.json({ document });
});
