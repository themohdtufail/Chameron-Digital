# File Storage Architecture

Phase 4A-2 hardening: this document explains how Chameron Digital stores uploaded files (product/store media, avatars, review photos, product-request photos, and seller KYC/verification documents), how to run it locally, and what's required to run it in production.

## 1. Architecture

```
Application code (API routes)
        │
        ▼
StorageDriver interface  (src/lib/storage.ts)
        │
   ┌────┴─────┐
   ▼          ▼
LocalStorageDriver   S3StorageDriver
(dev/demo only)      (production)
```

No application or business logic calls the AWS SDK, `fs`, or any storage-specific API directly — every read/write goes through `getStorage()`, which returns whichever driver `STORAGE_DRIVER` selects. This is the same seam pattern already used for payments (`payment-gateway.ts`), notifications (`notify.ts`), and AI (`ai.ts`): a provider-agnostic interface with a deterministic local implementation, swapped for a real one via an environment variable, never a code change at the call site.

```ts
interface StorageDriver {
  upload(file: Buffer, mimeType: string, folder: UploadFolder, ownerId?: string): Promise<string>;
  delete(ref: string, folder: UploadFolder): Promise<void>;
  getSignedUrl(ref: string, folder: UploadFolder, expiresInSeconds?: number): Promise<string>;
  isOwnReference(ref: string, folder: UploadFolder, ownerId?: string): boolean;
}
```

`UploadFolder` is `"stores" | "products" | "avatars" | "reviews" | "requests" | "documents"`. Only `"documents"` (seller KYC/verification uploads) is **private**; everything else is public storefront media.

### Public vs. private folders

| Folder | Visibility | What it holds |
|---|---|---|
| stores, products, avatars, reviews, requests | Public | Storefront/product images, product videos, avatars, review photos, product-request photos |
| documents | **Private** | Seller KYC/verification documents (shop proof, GST, FSSAI, business certificate) |

`upload()` returns different things depending on visibility:
- **Public folder** → a directly-usable URL (unchanged from the original local-only implementation — every existing `<img src={...}>` in the app keeps working with zero frontend changes).
- **Private folder** → an opaque reference (an S3 object key on the S3 driver) that is **not** directly renderable. Callers must call `getSignedUrl()` to get something a browser can actually load, and that call is only ever made from routes that have already checked the requester is authorized (see §7).

## 2. Local development

Default (`STORAGE_DRIVER` unset, or `local`): files are written under `/public/uploads/{folder}/` and served by Next.js's static file handling — no AWS account, no credentials, nothing to configure. This is unchanged from before this phase; local development requires zero new setup.

Local storage's threat model is dev-only: anything under `/public` is served to anyone with the URL, with no authentication, and Vercel's filesystem is ephemeral (uploads vanish on the next deploy). **Never use `STORAGE_DRIVER=local` in a real production deployment, and never put real KYC documents through it.**

## 3. Production (S3) configuration

Set:
```
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket-name
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_URL=       # optional — see "CDN" below
```

If `STORAGE_DRIVER=s3` and any of `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` is missing, the app **fails loudly** the first time storage is used (a clear `StorageConfigError` naming exactly which variable is missing, logged server-side; the client gets a generic 500). It never silently falls back to local storage — a misconfigured production deploy is a visible outage, not a silent data-loss trap. This is enforced by `getStorage()`'s driver selection having no fallback branch at all (verified: `STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver()` — the only way to get the local driver is to not ask for S3 in the first place).

Credentials are read only from `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` server-side environment variables — never sent to the browser, never accepted from a request body, never logged.

## 4. Required AWS resources

- **One S3 bucket**, private by default:
  - Block Public Access: keep **Block public access via ACLs** ON (`BlockPublicAcls`, `IgnorePublicAcls` = true) — this app never uses ACLs.
  - Turn OFF `BlockPublicPolicy` and `RestrictPublicBuckets` so the scoped bucket policy below can take effect. (The bucket is still not "public" in any broad sense — only the exact `public/*` prefix the policy names becomes world-readable.)
- **One IAM user or role** (see §5) with access keys, used only by the application.

### Bucket policy (public prefix only — never the whole bucket)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadOnlyPublicPrefix",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET/public/*"
    }
  ]
}
```

Nothing under `private/*` is ever granted public access by this policy — that prefix holds KYC documents and is only ever reached through a short-lived signed URL (§7).

## 5. IAM — least privilege

The application's own IAM user/role gets **only** this — never `AdministratorAccess`, `PowerUserAccess`, or an unscoped `s3:*`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppObjectAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET/*"
    }
  ]
}
```

- No `s3:ListBucket` — the app always reads/writes/deletes by a specific key it already knows (from a DB row), never lists the bucket, so this permission is genuinely unnecessary and is deliberately omitted.
- No `s3:PutBucketPolicy`/`s3:PutBucketAcl`/`s3:DeleteBucket` or any bucket-management action — the application only ever touches objects, never bucket configuration.
- If your AWS setup supports scoping resources tighter than the whole bucket (e.g. a dedicated bucket per environment, or you're comfortable maintaining two statements — `public/*` and `private/*` — instead of one `*`), do that; the single `Resource: "arn:aws:s3:::YOUR_BUCKET/*"` above is the practical minimum for one bucket shared by both prefixes.

## 6. Object keys

Never the client-supplied filename. Every key's filename component is `nanoid(20)` (a random, URL-safe, collision-resistant string — see `src/lib/storage-keys.ts`) plus an extension **derived from the already-validated MIME type**, not from the browser-supplied filename — a file whose bytes were verified as a real JPEG always gets `.jpg`, regardless of what the upload named it (closes a "photo.jpg.exe" filename-spoofing gap the original implementation had).

- Public: `public/{folder}/{randomId}.{ext}`
- Private (documents): `private/documents/{storeId}/{randomId}.{ext}` — scoped under the owning store, both so a leaked key from one store can't be guessed/reused for another (`isOwnReference()` checks this scoping — see §9) and so a future tighter IAM policy could restrict access by prefix per tenant if ever needed.

## 7. KYC / private document access

- Documents are **only** ever reachable through `getSignedUrl()` (default 15-minute expiry) — nothing persists a permanent public link to a KYC document anywhere: not the database (`StoreDocument.key` stores the S3 object key, not a URL — see the schema note below), not an API response, not a log line.
- Authorization is enforced server-side, before a signed URL is ever generated, in both routes that can produce one:
  - `GET /api/seller/documents` — a seller only ever sees their own store's documents (`storeId` scoped in the query).
  - `GET /api/admin/stores/[id]` — admin-only route (`requireRole("ADMIN")`), plus an explicit `canViewStoreDocuments()` check (`src/lib/documents.ts`) so the rule ("admin sees any store's documents; a seller sees only their own; nobody else sees any") is asserted in code and unit-tested, not left as an implicit consequence of route placement.
- A seller **cannot** view another seller's documents; a buyer or delivery partner **cannot** view any seller's documents. Verified in `tests/documents.test.ts`.
- Uploading into the private `documents` folder is itself gated: `/api/upload` only accepts folder=`"documents"` from an authenticated `SELLER` with a store, and derives the S3 key's `{storeId}` scope from that seller's own store server-side — never from a client-supplied field.
- `POST /api/seller/documents` (attaching an uploaded reference to a `StoreDocument` row) rejects anything that isn't a reference this exact store's own upload could have produced (`isOwnReference(key, "documents", storeId)`) — this blocks both an arbitrary external URL and another store's real object key from being submitted as "my document."
- Admin access to a store's KYC documents is audit-logged (`KYC_DOCUMENTS_VIEWED`, `src/lib/audit.ts`) whenever the admin store-detail route is loaded for a store that has documents.
- Nothing about a document's content, its signed URL, or the document itself is ever written to logs — only `{ operation, provider, folder, ok, errorType }` on failures (see §11).

### Why `StoreDocument.key`, not `.url`

The column was renamed from `url` to `key` in this phase (migration `20260906172335_storedocument_rename_url_to_key`, a plain `ALTER TABLE ... RENAME COLUMN`, not a drop/recreate — existing data is preserved exactly). The old name was actively misleading: for the S3 driver this column never held a directly-usable URL, only a private object key that requires a signed URL to access — a future contributor reading `StoreDocument.url` and rendering it directly would have created an outage (broken images) or, worse, might "fix" that by making the value public. No other file-reference column needed renaming: every other one (`ProductImage.url`, `Store.logoUrl`/`coverUrl`, `User.avatarUrl`, `Product.videoUrl`, `Review.imageUrl`, `ProductRequest.photoUrl`) is genuinely a stable, permanent public URL under the S3 driver too (via the bucket-policy-scoped `public/*` prefix), so the existing field name and shape stay accurate and no other schema change was needed.

## 8. Product/store media

Public media is stored persistently in S3 under `public/{folder}/...`, world-readable only via the scoped bucket policy (§4) — the bucket itself stays private (Block Public Access mostly on). The database keeps storing the resulting stable public URL exactly as it did with local storage; no code that renders `<img src={product.images[0].url}>` (or any of the other public-media fields) needed to change.

Binary files are never stored in PostgreSQL — only the reference (URL or key) and metadata (upload timestamp, type) live in the database, both before and after this phase.

## 9. Security review (this phase)

| Risk | Status |
|---|---|
| Path traversal | Object filenames are always `nanoid(20)` + an extension derived from the validated MIME type — the client-supplied original filename is never used to build a path, on either driver. |
| Arbitrary/executable file upload | MIME allowlist + magic-byte signature verification (`matchesFileSignature`, unchanged from before this phase) — content must match a real image/video signature; a `.exe`/`.php` cannot pass. |
| MIME spoofing / filename-extension mismatch | Closed in this phase: the stored extension is derived from the *validated* MIME type, never the browser-supplied filename, so a real JPEG can no longer end up stored with a `.exe`/`.php` extension. |
| Oversized upload | Unchanged 10MB cap (`MAX_UPLOAD_BYTES`), enforced before any storage call. |
| IDOR / cross-seller KYC access | Reviewed and tested — see §7 and `tests/documents.test.ts`. |
| Public exposure of private documents | Bucket policy grants public read to `public/*` only; `private/*` is never in any public-read statement. `StoreDocument` never stores a raw URL, only a key. |
| Leaked signed URLs | Short-lived (15 min default), generated only after authorization, never logged, never included in an error response. |
| Credential exposure | `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` are read server-side only; never sent to the browser, never accepted from a request; storage errors return a generic message to the client (`withApiErrors`'s catch-all), never the AWS SDK's raw error. |
| Bucket misconfiguration | Documented explicitly in §4 — private-by-default with one narrow public-read exception, not a public bucket. |
| Overly broad IAM | §5 — three object-level actions, no `ListBucket`, no bucket-management actions, no wildcard service access. |
| SSRF via remote URLs | `POST /api/seller/documents` no longer accepts an arbitrary URL string — it's validated against `isOwnReference()`, so a URL/key that didn't come from this store's own recent upload is rejected before it's ever stored or (later) signed and fetched by an admin's browser. |
| Object key collisions | `nanoid(20)` — astronomically low collision probability, same guarantee the original local-only implementation already had. |
| Race conditions | Each upload gets its own random key; there's no shared mutable state between concurrent uploads to race on. |
| Orphaned objects | See §11 — a known, documented, not-fully-closed gap. |

## 10. Migrating pre-existing local uploads

A fresh Vercel deployment has nothing to migrate (its local filesystem was already ephemeral — nothing persisted there in the first place). If a long-running self-hosted deployment has accumulated real files under `/public/uploads` before switching to S3, run:

```bash
STORAGE_DRIVER=s3 S3_BUCKET=... S3_REGION=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
  npm run migrate:uploads-to-s3 -- --dry-run   # verify first
npm run migrate:uploads-to-s3                  # then for real
```

(`scripts/migrate-local-uploads-to-s3.ts`.) It is explicit, opt-in, and **never runs automatically** — not from `build`, `postinstall`, or `db:seed`. It uploads each locally-referenced file to S3, updates the corresponding database row, and **never deletes the original local file** — verify the new URLs load, then remove the old files by hand. A row that fails to migrate is left exactly as it was (still pointing at the local path) and reported at the end, never silently dropped or partially updated.

## 11. What happens when storage is unavailable

Every driver method (`upload`/`delete`/`getSignedUrl`) throws `StorageOperationError` on failure rather than returning a value that looks like success:

- **Upload fails** → the route that called it never creates the corresponding database record — `/api/upload` simply returns an error response; nothing downstream (a product, a store, a KYC document) gets attached to a reference that was never actually written.
- **Delete fails** (`DELETE /api/seller/documents/[id]`) → the storage delete is attempted *before* the database row is removed; if it throws, the row stays in place (a live object with a live pointer, not silently orphaned) and the client gets a real error rather than a false "deleted" response.
- **Signed URL generation fails** → the request fails with a generic 500; no partial or fallback URL is ever returned.
- **`STORAGE_DRIVER=s3` with missing config** → fails at first use with a specific, logged (server-side only) configuration error — see §3.

### Known remaining gap: orphaned objects on the upload→attach boundary

Uploading a file and attaching it to a database record (a product image, a KYC document) are two separate API calls (`POST /api/upload`, then e.g. `POST /api/seller/documents`) — this was true before this phase and is unchanged by it. If the first succeeds but the second never happens (the user closes the tab, a network drop, a validation failure on the second call), the S3 object is never referenced by anything and is never automatically cleaned up. This is a pre-existing architectural pattern, not something introduced in this phase, and merging both calls into one atomic multi-part endpoint per entity is a larger redesign out of this phase's scope (see §J of the final report). Mitigation for later: an S3 lifecycle rule expiring objects under `public/`/`private/` that are older than N days and never got a matching DB reference, or a periodic reconciliation job — neither exists today.

## 12. CDN (future)

Not added in this phase — not needed at current traffic, and the task explicitly scopes it out. The storage abstraction is already shaped so it can be added later without touching application code: `S3_PUBLIC_URL` (already read by `S3StorageDriver`) is exactly the hook — point it at a CloudFront distribution's domain instead of the raw S3 endpoint, and every public URL the app generates and stores from that point forward is a CDN URL, with zero code changes anywhere else. (Already-stored public URLs pointing at the raw S3 endpoint would keep working — S3 origins remain directly reachable — but wouldn't retroactively route through the new CDN without a follow-up migration pass, the same `migrate-*-to-*` pattern as §10.)
