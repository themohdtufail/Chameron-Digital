import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

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

/**
 * Confirms the file's actual bytes match its declared MIME type, on top of
 * the browser-supplied Content-Type check — a renamed/relabeled malicious
 * file (e.g. a script saved as "photo.jpg") won't match any signature below
 * and gets rejected before it ever reaches disk.
 */
export function matchesFileSignature(buffer: Buffer, mimeType: string): boolean {
  const bytes = (...offsets: number[]) => offsets.map((o) => buffer[o]);

  switch (mimeType) {
    case "image/jpeg":
      return bytes(0, 1, 2).join(",") === "255,216,255";
    case "image/png":
      return bytes(0, 1, 2, 3).join(",") === "137,80,78,71";
    case "image/gif":
      return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "image/webp":
      return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "video/webm":
      return bytes(0, 1, 2, 3).join(",") === "26,69,223,163";
    case "video/mp4":
    case "video/quicktime":
      // ISO base media (mp4/mov): a 4-byte box size, then an ASCII box type.
      // The first box is usually "ftyp"; some encoders emit "moov"/"free"/"wide" first.
      return ["ftyp", "moov", "free", "wide", "mdat", "skip"].includes(buffer.subarray(4, 8).toString("ascii"));
    default:
      return false;
  }
}
