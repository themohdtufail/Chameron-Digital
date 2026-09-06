import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as presignS3Url } from "@aws-sdk/s3-request-presigner";
import { isPrivateFolder, safeObjectFilename, type UploadFolder } from "@/lib/storage-keys";

export { matchesFileSignature } from "@/lib/file-signature";
export { isPrivateFolder, extensionForMimeType, safeObjectFilename, type UploadFolder } from "@/lib/storage-keys";

export class StorageConfigError extends Error {}
export class StorageOperationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

/** Safe structured logging for storage failures — operation/provider/folder
 * only, never the file buffer, a signed URL, or any credential. */
function logStorageEvent(event: { operation: string; provider: string; folder: UploadFolder; ok: boolean; errorType?: string }) {
  if (event.ok) return;
  console.error("[storage]", JSON.stringify(event));
}

export interface StorageDriver {
  /** Uploads a file and returns a reference to persist in the database.
   * For public folders this is a directly-usable URL (unchanged from
   * existing behavior). For private folders (documents/KYC) this is an
   * opaque reference that is NOT directly renderable — callers must go
   * through getSignedUrl() to actually access it. */
  upload(file: Buffer, mimeType: string, folder: UploadFolder, ownerId?: string): Promise<string>;
  /** Deletes a previously-uploaded object. Throws on failure — callers must
   * never report success without a successful delete. */
  delete(ref: string, folder: UploadFolder): Promise<void>;
  /** Resolves a stored reference to a URL the browser can actually load
   * right now. For public folders this is a no-op (the ref is already a
   * URL). For private folders this generates a short-lived signed URL. */
  getSignedUrl(ref: string, folder: UploadFolder, expiresInSeconds?: number): Promise<string>;
  /** True if `ref` looks like something this driver's own upload() could
   * have produced for `folder` (and, when given, scoped to `ownerId`) —
   * used to reject a client submitting an arbitrary external URL/path, or
   * another tenant's own real object key, where a fresh storage reference
   * from this owner is expected. */
  isOwnReference(ref: string, folder: UploadFolder, ownerId?: string): boolean;
}

/**
 * Local filesystem driver — stores files under /public/uploads so they are
 * served directly by Next.js's static file handling. This is a dev/demo-only
 * driver: Vercel's filesystem is ephemeral (uploads vanish on redeploy), and
 * anything under /public is served to anyone with the URL, with no
 * authentication — acceptable for local development, never for real KYC
 * data. Production must use STORAGE_DRIVER=s3 (see S3StorageDriver below).
 */
class LocalStorageDriver implements StorageDriver {
  private dirFor(folder: UploadFolder) {
    return path.join(process.cwd(), "public", "uploads", folder);
  }

  async upload(file: Buffer, mimeType: string, folder: UploadFolder) {
    const filename = safeObjectFilename(mimeType);
    const dir = this.dirFor(folder);
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), file);
    } catch (err) {
      logStorageEvent({ operation: "upload", provider: "local", folder, ok: false, errorType: (err as Error).name });
      throw new StorageOperationError("Failed to store uploaded file", err);
    }
    return `/uploads/${folder}/${filename}`;
  }

  async delete(ref: string, folder: UploadFolder) {
    const filename = path.basename(ref);
    try {
      await unlink(path.join(this.dirFor(folder), filename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return; // already gone
      logStorageEvent({ operation: "delete", provider: "local", folder, ok: false, errorType: (err as Error).name });
      throw new StorageOperationError("Failed to delete stored file", err);
    }
  }

  async getSignedUrl(ref: string) {
    // Local dev has no real access-control layer to sign against — the ref
    // is already a directly-servable static path. Documented limitation:
    // this driver must never be used for real KYC data in production.
    return ref;
  }

  isOwnReference(ref: string, folder: UploadFolder) {
    // Local dev has no per-owner key scoping (matches its flatter, dev-only
    // threat model) — ownerId is intentionally not checked here.
    return ref.startsWith(`/uploads/${folder}/`);
  }
}

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
}

function readS3Config(): S3Config {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const missing = [
    !bucket && "S3_BUCKET",
    !region && "S3_REGION",
    !accessKeyId && "S3_ACCESS_KEY_ID",
    !secretAccessKey && "S3_SECRET_ACCESS_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    // Fail loudly at construction time — STORAGE_DRIVER=s3 must never
    // silently fall back to local storage just because config is missing.
    throw new StorageConfigError(
      `STORAGE_DRIVER=s3 but required environment variable(s) are missing: ${missing.join(", ")}. ` +
        "Set them (see .env.example) or set STORAGE_DRIVER=local for development."
    );
  }
  const publicBaseUrl = (process.env.S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/+$/, "");
  return { bucket: bucket!, region: region!, accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, publicBaseUrl };
}

/**
 * Real S3 driver (AWS SDK v3). Bucket is expected to be private by default
 * (Block Public Access on); only the "public/" key prefix is world-readable,
 * via a bucket policy scoped to that prefix (see docs/STORAGE.md) — never
 * the whole bucket. The "private/" prefix (KYC documents) is never public;
 * it is only ever reachable through a short-lived signed URL generated
 * here, after the caller has already authorized the request.
 */
class S3StorageDriver implements StorageDriver {
  private config: S3Config;
  private s3: S3Client;

  constructor() {
    this.config = readS3Config();
    this.s3 = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      maxAttempts: 3, // SDK's built-in exponential-backoff retry
    });
  }

  private keyFor(folder: UploadFolder, filename: string, ownerId?: string) {
    if (isPrivateFolder(folder)) {
      return `private/${folder}/${ownerId ?? "unassigned"}/${filename}`;
    }
    return `public/${folder}/${filename}`;
  }

  private publicUrlFor(key: string) {
    return `${this.config.publicBaseUrl}/${key}`;
  }

  /** Recovers the S3 key from whatever was stored as the reference: for
   * private folders the ref already IS the key; for public folders the ref
   * is the full public URL this driver constructed, so the known base is
   * stripped back off. */
  private keyFromRef(ref: string, folder: UploadFolder) {
    if (isPrivateFolder(folder)) return ref;
    const prefix = `${this.config.publicBaseUrl}/`;
    return ref.startsWith(prefix) ? ref.slice(prefix.length) : ref;
  }

  async upload(file: Buffer, mimeType: string, folder: UploadFolder, ownerId?: string) {
    const key = this.keyFor(folder, safeObjectFilename(mimeType), ownerId);
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: file,
          ContentType: mimeType,
          ContentDisposition: "inline",
        })
      );
    } catch (err) {
      logStorageEvent({ operation: "upload", provider: "s3", folder, ok: false, errorType: (err as Error).name });
      throw new StorageOperationError("Failed to upload file to cloud storage", err);
    }
    return isPrivateFolder(folder) ? key : this.publicUrlFor(key);
  }

  async delete(ref: string, folder: UploadFolder) {
    const key = this.keyFromRef(ref, folder);
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
    } catch (err) {
      logStorageEvent({ operation: "delete", provider: "s3", folder, ok: false, errorType: (err as Error).name });
      throw new StorageOperationError("Failed to delete file from cloud storage", err);
    }
  }

  async getSignedUrl(ref: string, folder: UploadFolder, expiresInSeconds = 900) {
    if (!isPrivateFolder(folder)) return ref; // already a public URL
    const key = this.keyFromRef(ref, folder);
    try {
      return await presignS3Url(this.s3, new GetObjectCommand({ Bucket: this.config.bucket, Key: key }), {
        expiresIn: expiresInSeconds,
      });
    } catch (err) {
      logStorageEvent({ operation: "sign", provider: "s3", folder, ok: false, errorType: (err as Error).name });
      throw new StorageOperationError("Failed to generate access URL for stored file", err);
    }
  }

  isOwnReference(ref: string, folder: UploadFolder, ownerId?: string) {
    if (isPrivateFolder(folder)) {
      const prefix = ownerId ? `private/${folder}/${ownerId}/` : `private/${folder}/`;
      return ref.startsWith(prefix);
    }
    return ref.startsWith(`${this.config.publicBaseUrl}/public/${folder}/`);
  }
}

let driver: StorageDriver | null = null;

/** Selects the storage driver via STORAGE_DRIVER ("local" | "s3", default
 * "local"). Deliberately does NOT catch S3 configuration errors — a
 * production deploy with STORAGE_DRIVER=s3 and incomplete S3_* env vars
 * must fail loudly on first use, never silently fall back to ephemeral
 * local storage. */
export function getStorage(): StorageDriver {
  if (driver) return driver;
  driver = process.env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
  return driver;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
