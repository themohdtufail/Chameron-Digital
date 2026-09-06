/**
 * Explicit, non-destructive migration: copies any database rows whose media
 * field still points at a local "/uploads/..." path into S3, and updates
 * that row to the new S3 reference.
 *
 * This does NOT run automatically — it is not wired into build, postinstall,
 * or seed. Run it by hand, once, when cutting a deployment over from
 * STORAGE_DRIVER=local to STORAGE_DRIVER=s3 with pre-existing local uploads
 * (e.g. a long-running self-hosted instance). A fresh Vercel deployment has
 * nothing to migrate — its local filesystem was already ephemeral.
 *
 * Safety:
 *  - Never deletes the local file. If a row is migrated, the original stays
 *    on disk until an operator removes it by hand, after confirming the S3
 *    copy is good.
 *  - Never deletes or overwrites a DB row on failure — a row that fails to
 *    migrate is left exactly as it was (still pointing at the local path)
 *    and reported, not silently skipped or corrupted.
 *  - Idempotent: re-running only touches rows that still point at a local
 *    path; already-migrated rows (S3 URLs/keys) are left alone.
 *
 * Usage:
 *   STORAGE_DRIVER=s3 S3_BUCKET=... S3_REGION=... S3_ACCESS_KEY_ID=... \
 *     S3_SECRET_ACCESS_KEY=... DATABASE_URL=... DIRECT_URL=... \
 *     npx tsx scripts/migrate-local-uploads-to-s3.ts [--dry-run]
 */
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { getStorage, extensionForMimeType, type UploadFolder } from "../src/lib/storage";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"].map((mime) => [
    extensionForMimeType(mime),
    mime,
  ])
);

function guessMimeType(localPath: string): string {
  return MIME_BY_EXT[path.extname(localPath).toLowerCase()] ?? "application/octet-stream";
}

function isLocalRef(ref: string | null | undefined): ref is string {
  return typeof ref === "string" && ref.startsWith("/uploads/");
}

async function migrateOne(ref: string, folder: UploadFolder, ownerId?: string): Promise<string> {
  const localFile = path.join(process.cwd(), "public", ref);
  const buffer = await readFile(localFile);
  const mimeType = guessMimeType(ref);
  return getStorage().upload(buffer, mimeType, folder, ownerId);
}

interface Summary {
  migrated: number;
  skipped: number;
  failed: { model: string; id: string; error: string }[];
}

async function migrateField<T extends { id: string }>(
  summary: Summary,
  modelName: string,
  rows: T[],
  getRef: (row: T) => string | null | undefined,
  folder: UploadFolder,
  save: (id: string, newRef: string) => Promise<void>,
  getOwnerId?: (row: T) => string | undefined
) {
  for (const row of rows) {
    const ref = getRef(row);
    if (!isLocalRef(ref)) {
      summary.skipped++;
      continue;
    }
    try {
      const newRef = await migrateOne(ref, folder, getOwnerId?.(row));
      if (!DRY_RUN) await save(row.id, newRef);
      console.log(`[migrate] ${modelName} ${row.id}: ${ref} -> ${newRef}${DRY_RUN ? " (dry run, not saved)" : ""}`);
      summary.migrated++;
    } catch (err) {
      console.error(`[migrate] FAILED ${modelName} ${row.id}: ${(err as Error).message}`);
      summary.failed.push({ model: modelName, id: row.id, error: (err as Error).message });
    }
  }
}

async function main() {
  if (process.env.STORAGE_DRIVER !== "s3") {
    console.error("Refusing to run: set STORAGE_DRIVER=s3 (plus the S3_* vars) so uploads actually go to S3.");
    process.exit(1);
  }
  if (DRY_RUN) console.log("--dry-run: uploading to S3 to verify readability, but NOT writing any database changes.\n");

  const summary: Summary = { migrated: 0, skipped: 0, failed: [] };

  const stores = await prisma.store.findMany({ select: { id: true, logoUrl: true, coverUrl: true } });
  await migrateField(summary, "Store.logoUrl", stores, (s) => s.logoUrl, "stores", (id, url) =>
    prisma.store.update({ where: { id }, data: { logoUrl: url } }).then(() => undefined)
  );
  await migrateField(summary, "Store.coverUrl", stores, (s) => s.coverUrl, "stores", (id, url) =>
    prisma.store.update({ where: { id }, data: { coverUrl: url } }).then(() => undefined)
  );

  const productImages = await prisma.productImage.findMany({ select: { id: true, url: true } });
  await migrateField(summary, "ProductImage.url", productImages, (i) => i.url, "products", (id, url) =>
    prisma.productImage.update({ where: { id }, data: { url } }).then(() => undefined)
  );

  const products = await prisma.product.findMany({ select: { id: true, videoUrl: true } });
  await migrateField(summary, "Product.videoUrl", products, (p) => p.videoUrl, "products", (id, url) =>
    prisma.product.update({ where: { id }, data: { videoUrl: url } }).then(() => undefined)
  );

  const users = await prisma.user.findMany({ select: { id: true, avatarUrl: true } });
  await migrateField(summary, "User.avatarUrl", users, (u) => u.avatarUrl, "avatars", (id, url) =>
    prisma.user.update({ where: { id }, data: { avatarUrl: url } }).then(() => undefined)
  );

  const reviews = await prisma.review.findMany({ select: { id: true, imageUrl: true } });
  await migrateField(summary, "Review.imageUrl", reviews, (r) => r.imageUrl, "reviews", (id, url) =>
    prisma.review.update({ where: { id }, data: { imageUrl: url } }).then(() => undefined)
  );

  const requests = await prisma.productRequest.findMany({ select: { id: true, photoUrl: true } });
  await migrateField(summary, "ProductRequest.photoUrl", requests, (r) => r.photoUrl, "requests", (id, url) =>
    prisma.productRequest.update({ where: { id }, data: { photoUrl: url } }).then(() => undefined)
  );

  // KYC documents: private folder, key scoped by storeId — must migrate
  // into the same store's private prefix, not a flat one.
  const documents = await prisma.storeDocument.findMany({ select: { id: true, key: true, storeId: true } });
  await migrateField(
    summary,
    "StoreDocument.key",
    documents,
    (d) => d.key,
    "documents",
    (id, key) => prisma.storeDocument.update({ where: { id }, data: { key } }).then(() => undefined),
    (d) => d.storeId
  );

  console.log("\n--- Migration summary ---");
  console.log(`Migrated: ${summary.migrated}`);
  console.log(`Skipped (already remote or empty): ${summary.skipped}`);
  console.log(`Failed: ${summary.failed.length}`);
  if (summary.failed.length > 0) {
    console.log("\nFailed rows (left untouched, still pointing at the local file):");
    for (const f of summary.failed) console.log(`  ${f.model} ${f.id}: ${f.error}`);
    process.exitCode = 1;
  }
  if (summary.migrated > 0 && !DRY_RUN) {
    console.log(
      "\nOriginal local files under public/uploads were NOT deleted. Verify the new S3 URLs load correctly, then remove them by hand."
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
