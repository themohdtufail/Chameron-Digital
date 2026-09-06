import { nanoid } from "nanoid";

/**
 * Pure, filesystem/network-free storage logic — split out from storage.ts
 * (which is server-only, touching the filesystem and the AWS SDK) so it can
 * be unit tested directly, the same reason matchesFileSignature lives in
 * its own file rather than storage.ts.
 */

export type UploadFolder = "stores" | "products" | "avatars" | "reviews" | "requests" | "documents";

// Only "documents" (seller KYC/verification uploads) is private — everything
// else is customer-facing storefront media that's meant to be publicly
// viewable. This list is the single source of truth both drivers key off,
// so adding a new private category later is a one-line change here rather
// than a change scattered across both drivers.
const PRIVATE_FOLDERS: readonly UploadFolder[] = ["documents"];

export function isPrivateFolder(folder: UploadFolder): boolean {
  return PRIVATE_FOLDERS.includes(folder);
}

// Extensions are derived from the already-validated MIME type, never from
// the client-supplied original filename — a file whose bytes were verified
// as a real JPEG always gets ".jpg", regardless of what the browser sent as
// its name (closes the "photo.jpg.exe" filename-spoofing gap: the stored
// object's extension can never claim a type its content isn't).
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export function extensionForMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "";
}

/** A short, random, filesystem/URL-safe filename — never derived from
 * user input, so it can't path-traverse, collide, or inject characters. */
export function safeObjectFilename(mimeType: string): string {
  return `${nanoid(20)}${extensionForMimeType(mimeType)}`;
}
