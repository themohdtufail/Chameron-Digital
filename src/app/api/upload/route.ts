import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getStorage,
  MAX_UPLOAD_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  matchesFileSignature,
  type UploadFolder,
} from "@/lib/storage";
import { withApiErrors, jsonError } from "@/lib/api-utils";

const ALLOWED_FOLDERS: UploadFolder[] = ["stores", "products", "avatars"];

export const POST = withApiErrors(async (req: NextRequest) => {
  await requireUser();

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

  const url = await getStorage().upload(buffer, file.name, folderInput as UploadFolder);

  return NextResponse.json({ url, type: isVideo ? "video" : "image" });
});
