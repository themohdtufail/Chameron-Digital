import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export { matchesFileSignature } from "@/lib/file-signature";

export type UploadFolder = "stores" | "products" | "avatars" | "reviews" | "requests";

export interface StorageDriver {
  upload(file: Buffer, originalName: string, folder: UploadFolder): Promise<string>;
}

/**
 * Local filesystem driver — stores files under /public/uploads so they are
 * served directly by Next.js. Good enough for a single-instance dev/demo
 * deployment; swap STORAGE_DRIVER=s3 in production (see S3Driver below).
 */
class LocalStorageDriver implements StorageDriver {
  async upload(file: Buffer, originalName: string, folder: UploadFolder) {
    const ext = path.extname(originalName) || "";
    const filename = `${nanoid(12)}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), file);
    return `/uploads/${folder}/${filename}`;
  }
}

/**
 * S3-compatible driver stub. Fill in with @aws-sdk/client-s3 when moving to
 * production — the interface is already what the rest of the app depends
 * on, so no calling code changes are needed.
 */
class S3StorageDriver implements StorageDriver {
  async upload(): Promise<string> {
    throw new Error(
      "S3 storage driver is not configured. Install @aws-sdk/client-s3 and " +
        "implement upload() using S3_* env vars, or set STORAGE_DRIVER=local."
    );
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  driver = process.env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
  return driver;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
