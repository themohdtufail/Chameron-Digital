import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getStorage,
  MAX_UPLOAD_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  matchesFileSignature,
  isPrivateFolder,
  type UploadFolder,
} from "@/lib/storage";
import { withApiErrors, jsonError } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";

const ALLOWED_FOLDERS: UploadFolder[] = ["stores", "products", "avatars", "reviews", "requests", "documents"];

export const POST = withApiErrors(async (req: NextRequest) => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "upload", { windowSeconds: 60 * 60, max: 60 });

  const form = await req.formData();
  const file = form.get("file");
  const folderInput = String(form.get("folder") || "products");

  if (!(file instanceof File)) return jsonError("No file provided", 400);
  if (!ALLOWED_FOLDERS.includes(folderInput as UploadFolder)) return jsonError("Invalid upload folder", 400);
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("File is too large (max 10MB)", 400);

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) return jsonError("Unsupported file type", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesFileSignature(buffer, file.type)) {
    return jsonError("File content does not match its declared type", 400);
  }

  const folder = folderInput as UploadFolder;

  // The "documents" folder (KYC/verification uploads) is seller-only and
  // key-scoped by store, so the owning store is resolved server-side here —
  // never trusted from the client — and used to build the private object
  // key (private/documents/{storeId}/...) rather than an ownerId a caller
  // could otherwise spoof.
  let ownerId: string | undefined;
  if (isPrivateFolder(folder)) {
    if (user.role !== "SELLER") return jsonError("Only sellers can upload verification documents", 403);
    const store = await prisma.store.findUnique({ where: { ownerId: user.id }, select: { id: true } });
    if (!store) return jsonError("Store not found", 404);
    ownerId = store.id;
  }

  const url = await getStorage().upload(buffer, file.type, folder, ownerId);

  return NextResponse.json({ url, type: isVideo ? "video" : "image" });
});
