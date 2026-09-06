# Chameron Digital

**Your local market, now online.**

Chameron Digital is a local-commerce platform that gives every local business its own digital storefront and lets nearby customers discover, browse, and order from them. Phase 1 shipped the MVP (buyer, seller, and admin experiences). Phase 2, in this repository, extends it into a production commerce experience: an 8-state order lifecycle, wishlist, buyer product requests, an in-app notification center, seller inventory/analytics/store-hours tooling, rate limiting and an audit trail, and an automated test suite — all built on the same architecture without a rewrite.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Architecture overview](#architecture-overview)
3. [Database schema](#database-schema)
4. [Local setup](#local-setup)
5. [Test accounts](#test-accounts)
6. [Feature tour](#feature-tour)
7. [Security](#security)
8. [Testing](#testing)
9. [Deployment guide](#deployment-guide)
10. [Future roadmap](#future-roadmap)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components for fast, SEO-friendly pages + colocated API routes for the backend |
| Language | TypeScript | End-to-end type safety from database to UI |
| Database | PostgreSQL | Relational integrity, scales horizontally with the platform |
| ORM | Prisma | Type-safe queries, migrations, schema-as-code |
| Styling | Tailwind CSS | Fast, consistent, themeable design system |
| Auth | Custom mobile OTP + JWT (jose) | Password-less login matching the product spec; role-based sessions |
| File storage | Pluggable driver (`local` now, `s3`-ready) | Local disk for dev/demo, drop-in S3 for production |
| Validation | Zod | Shared, typed validation on every API boundary |

No external paid services are required to run the full MVP locally — OTPs are logged to the console in dev mode and file uploads are stored on disk.

## Architecture overview

```
src/
  app/
    api/                # REST API — the "backend". Every route validates input,
                         # checks auth/role, and returns JSON.
    role/                # Buyer vs Seller chooser
    buyer/               # Buyer-only routes (protected by middleware)
      login/ location/   # public within /buyer
      (app)/              # bottom-nav app shell: home, stores, categories, orders,
                          # wishlist, requests, notifications, profile, store/[slug],
                          # cart, checkout, order/[id]
      product/[slug]/     # full-screen product detail (own layout, no bottom nav);
                          # a legacy /product/[id] request 301s to the slug URL
    seller/              # Seller-only routes
      login/ register/ pending/
      (app)/              # dashboard, products, categories, inventory, orders,
                          # requests, analytics, customers, notifications, settings
    admin/               # Admin-only routes
      login/
      (app)/              # dashboard, sellers, categories, users, orders
  components/            # Reusable UI, grouped by domain (ui/, buyer/, seller/, admin/, auth/)
  lib/                   # db client, auth/session, otp, storage, validation, utils,
                         # pricing (cart/order math), order-status (state machine),
                         # notify (notification seam), rate-limit, audit, store-helpers
  middleware.ts          # Edge middleware enforcing role-based route access
prisma/
  schema.prisma          # Full data model
  seed.ts                # Demo data + test accounts
tests/                   # Vitest unit/integration tests — see Testing below
```

**Why this structure holds up at scale:**

- **Route groups per role** (`(app)`) let each experience have its own shell/navigation without leaking into the others, while `middleware.ts` enforces at the edge that a buyer session can never reach `/seller/*` or `/admin/*` and vice versa.
- **The API layer is the real backend.** Every mutation goes through `src/app/api/**`, validated with Zod and authorized with `requireUser`/`requireRole`. This means a future native mobile app, a partner integration, or a WhatsApp bot can reuse the exact same endpoints — the web app is just one client of the API. Full endpoint reference: [`docs/API.md`](./docs/API.md).
- **Storage is an interface** (`src/lib/storage.ts`), not a hard dependency on the filesystem. Swapping to S3/Cloudflare R2 for production is a one-file change.
- **The database schema separates concerns that will each become their own bounded context** as the platform grows (catalog, orders, identity, location) — see below.

## Database schema

Defined in [`prisma/schema.prisma`](./prisma/schema.prisma). Key models:

| Model | Purpose |
|---|---|
| `User` | Single identity table with a `role` (`BUYER` / `SELLER` / `ADMIN` / `DELIVERY_PARTNER`). Phone is the unique login key. |
| `DeliveryPartner` | Profile for the `DELIVERY_PARTNER` role — same approval-gate pattern as `Store` (`PENDING`→`APPROVED`), platform-wide (not store-scoped). |
| `OtpCode` | Short-lived, hashed OTP codes with attempt limiting. |
| `Session` | Server-tracked sessions (hashed token) so a session can be revoked; the JWT cookie references it by id. |
| `Location` | A buyer's saved/current addresses **and** the shipping address snapshot source for orders. |
| `Category` | Admin-managed business categories (Fashion, Food, Electronics, …). |
| `ProductCategory` | Seller-defined in-store navigation (Men, Women, Kids, Offers). |
| `Store` | A seller's digital storefront — profile, location, delivery settings, verification, vacation mode, and an approval `status`. `openingTime`/`closingTime` are the fallback used when no `StoreHours` rows exist. |
| `StoreHours` | Optional per-day-of-week open/close override (or closed) — `isStoreOpen()` in `src/lib/store-helpers.ts` checks these first, then falls back to the store's default scalar hours. |
| `Product` / `ProductImage` / `ProductVariant` | Catalog, with multi-image support (reorderable, first = cover), Size/Color/Material variants, a globally-unique `slug` (no DB ids in buyer-facing URLs), SKU, and per-product `lowStockThreshold`/`trackInventory`. |
| `Cart` / `CartItem` | One active cart per buyer. Items are constrained to a single store at a time (checkout maps 1 cart → 1 order → 1 store, matching a single-pickup delivery run). |
| `Order` / `OrderItem` | Immutable snapshots of price/name/variant at time of purchase, so catalog edits never change historical orders. `OrderStatus` is an 8-state pipeline (see below); cancellation/rejection record the actor, a reason, and a timestamp. |
| `Payment` | Source-of-truth payment record (1:1 with `Order`); `Order.paymentMethod`/`paymentStatus` stay as a denormalized read cache. No live gateway is wired up yet — this is the abstraction seam for one. |
| `Wishlist` | Buyer-saved products, unique per (buyer, product). |
| `Review` | Buyer ratings/comments/photo, tied to a specific **delivered** `Order` via a unique `orderId` (one review per eligible purchase, enforced at the DB level) — rolled up into `Store.ratingAvg`. |
| `ProductRequest` | "I'm looking for X" — a buyer asks (optionally targeting a store), the seller responds available/unavailable with a price and can attach an existing `Product`; the buyer then accepts/declines and buys through the normal product page. |
| `Notification` | In-app notifications (order lifecycle, low stock, product-request activity) for both buyers and sellers; `src/lib/notify.ts` is the provider-agnostic seam a push/email/SMS integration would plug into later. |
| `InventoryLog` | Append-only stock-change ledger — `ORDER` (checkout), `RETURN` (cancel/reject restores stock), `MANUAL` (seller adjustment), `RESTOCK`. Powers the per-product history view in the seller Inventory page. |
| `AuditLog` | Actor + action + entity + metadata trail for sensitive actions: order cancel/reject, product price change/delete, store approve/reject/suspend, user activate/deactivate. |
| `AnalyticsEvent` | Lightweight event log (currently `product_view`) powering the buyer home page's "Recently Viewed" row. |
| `RateLimitHit` | Backing store for the DB-backed fixed-window rate limiter (`src/lib/rate-limit.ts`) — see [Security](#security). |

Run `npx prisma studio` any time to browse the live data visually.

**Order lifecycle:** `PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED`, with `CANCELLED` (buyer-initiated, allowed through `CONFIRMED`) and `REJECTED` (seller-initiated, allowed through `CONFIRMED`) as side branches. The full transition matrix and authorization rules are a single pure function — `canTransition()` in `src/lib/order-status.ts` — shared by the API route and covered by the unit tests in `tests/order-status.test.ts`.

## Local setup

### Prerequisites

- Node.js 18+
- A PostgreSQL 14+ instance (local install, Docker, or a hosted database)

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` works around a known npm 10 arborist bug unrelated to this project; it is safe here.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` — at minimum set `DATABASE_URL` (and `DIRECT_URL`) to your Postgres instance. Everything else has a sensible dev default:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/chameron_digital"
DIRECT_URL="postgresql://user:password@localhost:5432/chameron_digital"
JWT_SECRET="replace-with-a-long-random-secret"
ADMIN_PHONE="+911234567890"
ADMIN_PASSWORD="ChameronAdmin@123"
OTP_DEV_MODE="true"          # OTPs are printed to the server console instead of sent via SMS
OTP_DEV_STATIC_CODE="123456"  # ...and this code always works in dev mode
STORAGE_DRIVER="local"        # uploads are written to /public/uploads
```

> `DIRECT_URL` is what Prisma Migrate uses to run schema changes. On a plain
> Postgres instance it's identical to `DATABASE_URL`. **On Neon specifically**,
> set `DATABASE_URL` to the pooled connection string (the one with `-pooler`
> in the hostname — used by the app at runtime) and `DIRECT_URL` to the
> direct/unpooled one from the same project (Neon's dashboard shows both) —
> migrations fail over the pooled connection.

### 3. Create the database schema

```bash
npx prisma migrate dev
```

### 4. Seed demo data (categories, an admin, two approved stores with products, a pending store, a buyer)

```bash
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

Visit **http://localhost:3000** — you'll land on the splash screen, then the buyer/seller chooser.

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build + serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply a new migration |
| `npm run db:seed` | Re-run the seed script |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run the Vitest suite (see [Testing](#testing)) |

## Test accounts

OTP login is password-less: request an OTP for any of the numbers below, and in dev mode (`OTP_DEV_MODE=true`) the code is **always `123456`** and is also printed in the server console and shown on-screen.

| Role | Phone | Notes |
|---|---|---|
| Buyer | `9876500001` (Aisha Sharma) | Has a saved location in Jammu and an empty order history |
| Seller | `9876500002` (Ramesh Kumar) | Owns **Jafson Jammu** — an approved Fashion store with 6 products and variants |
| Seller | `9876500003` (Priya Verma) | Owns **Spice Junction** — an approved Food store |
| Seller | `9876500004` (Vikram Singh) | Owns **TechHub Electronics** — a **pending** store, useful for testing the admin approval flow |
| Admin | phone `+911234567890`, password `ChameronAdmin@123` | Signs in at `/admin/login` (email/password style, not OTP) |

You can also just register a brand-new buyer or seller account with any phone number — the flow will walk you through the same signup collected in the spec (name, business details, etc.).

## Feature tour

**Buyer:** splash → role picker → OTP login → location → home (nearby/popular stores, categories, **Recently Viewed**) → **`/buyer/stores`** discovery page (search, sort by recommended/nearest/top-rated, open-now + min-rating filters, pagination) → store page (verified badge, open/closed, call/chat/**directions**/share, category tabs, search) → product detail (gallery, video, variants, **wishlist heart**, **share**, "More from this store", "You may also like") → **wishlist page** → cart → checkout (full address form — name/phone/house/landmark/area/city/state/pincode/delivery instructions — COD, "Online payment — coming soon") → order confirmation → order tracking with an 8-state timeline → **`/buyer/orders`** tabs (All/Active/Completed/Cancelled) → cancel (through Confirmed, with a reason), **reorder**, **contact store** → reviews with an optional photo on delivered orders → **`/buyer/requests`** ("I'm looking for X" with a reference photo/budget/preferred store; accept a seller's response and buy the linked product) → **notification center** (bell with unread badge, mark read/all-read).

**Seller:** OTP login → store registration → pending-approval screen → dashboard (today's orders, sales, products, customers, open/closed toggle, **low-stock alert**, quick links) → product management (multi-photo upload with **reorder**, video, variants, specifications, SKU, **low-stock threshold**, stock, hide/unhide, **bulk select** hide/unhide/delete) → **Categories** (add/rename/hide/reorder in-store nav) → **Inventory** (current/low/out-of-stock filters, +/- stock adjustment, per-product change history) → order management across the full 8-state pipeline (accept/reject with a reason/start preparing/mark ready/out for delivery/delivered) → customers list → **Analytics** (revenue/orders bar charts with Today/7d/30d filters, low-stock + pending-request tiles) → **Product Requests inbox** (respond available/unavailable with a price and message, optionally link an existing product) → store settings (per-day hours editor, **vacation mode**, **Preview Store** link, delivery fee, contact) → **notification center**.

**Admin:** password login → platform overview → approve/reject/suspend stores (audit-logged) → manage global categories → view/activate/deactivate users (audit-logged) → view all orders across the platform.

## Security

- **Password-less buyer/seller auth** via mobile OTP (hashed, rate-limited, single-use, 5-minute expiry); admin uses bcrypt-hashed passwords.
- **Session cookies** are `httpOnly`, `sameSite=lax`, signed JWTs (HS256), and reference a server-side `Session` row so they can be revoked on logout.
- **Role-based access control** enforced twice: at the edge in `middleware.ts` (route-level redirect) and again in every API handler via `requireRole()` (so a crafted request can't bypass the UI).
- **Ownership checks everywhere**: a seller can only read/mutate their own store, products, orders, categories, inventory, requests, and analytics; a buyer can only see their own cart/orders/addresses/wishlist/requests. Verified with a full pass over every route added in Phase 2 — see [`docs/API.md`](./docs/API.md).
- **DB-backed rate limiting** (`src/lib/rate-limit.ts`, fixed-window via the `RateLimitHit` table — safe across serverless cold starts, unlike an in-memory counter) applied to OTP request/verify, admin login, order creation, product-request creation, file uploads, and review creation. Exceeding a limit returns `429` with a `Retry-After` header.
- **CSRF defense in depth**: every mutating request is checked for a same-origin `Origin` header in `withApiErrors` (`src/lib/api-utils.ts`), on top of the `sameSite=lax` cookie.
- **Upload validation**: file type allowlist, a 10MB size cap, and a **magic-byte signature check** (`src/lib/file-signature.ts`) — a renamed/relabeled file (e.g. a script saved as `photo.jpg`) is rejected even if its declared MIME type looks fine.
- **All input is validated with Zod** at the API boundary before touching the database.
- **Server-side price recomputation** at checkout — the client never gets to say what an order costs.
- **Concurrency-safe stock**: checkout decrements stock with a conditional `UPDATE ... WHERE stock >= qty` inside the order transaction, so two simultaneous checkouts racing for the last unit can't both succeed (verified live — see [Testing](#testing)).
- **Audit trail**: `AuditLog` records actor + action + entity + metadata for order cancel/reject, product price change/delete, and admin store/user status changes.
- **No DB ids in buyer-facing URLs**: products are addressed by a globally-unique slug (`/buyer/product/[slug]`); old id-based links 301-redirect to the canonical slug.

## Testing

Every pull request and every push to `main` runs an automated CI quality gate (TypeScript, lint, tests, production build) via GitHub Actions — see [`docs/CI_CD.md`](docs/CI_CD.md) for exactly what it checks, how it uses a disposable database (never production), and how it relates to Vercel's separate deployment pipeline.

```bash
npm test
```

Runs the Vitest suite in `tests/`: pure unit tests for cart/order pricing math (`pricing.test.ts`), the full order-status transition matrix including authorization boundaries — buyer vs. seller vs. admin, valid and invalid moves (`order-status.test.ts`), store open/closed hours logic including `StoreHours` overrides and vacation mode (`store-helpers.test.ts`), upload magic-byte validation (`file-signature.test.ts`), assorted utilities (`utils.test.ts`), and an integration test of the DB-backed rate limiter against the real `RateLimitHit` table (`rate-limit.test.ts` — needs `DATABASE_URL`, same as `npm run dev`).

Coverage that isn't practical as an automated unit test — full page rendering, multi-actor flows, real HTTP races — was verified live during development instead: a real two-buyer concurrent-checkout race against a single remaining unit resolved to exactly one success and one `409` with stock landing at exactly `0` (never negative); the full 8-state order pipeline, cancellation/stock-restoration, notification delivery, and the product-request round trip were each walked end-to-end through the actual API and screenshotted through the actual UI at every milestone of this build (see the git history on this branch for the walkthroughs). A maintained end-to-end browser suite is a reasonable next addition (see [Future roadmap](#future-roadmap)).

## Deployment guide

The app is a standard Next.js application and deploys cleanly to any Node host. A common path:

### Vercel + managed Postgres (fastest)

1. Push this repo to GitHub.
2. Create a Postgres database and copy its connection string(s):
   - **Neon**: copy both the **pooled** connection string (hostname contains `-pooler`) and the **direct** one from the same dashboard panel.
   - **Vercel Postgres / Supabase / RDS**: use the same connection string for both variables below unless the provider gives you a separate pooler endpoint.
3. Import the repo into Vercel and set the environment variables from `.env.example` in the Vercel project settings **before** the first deploy — in particular `DATABASE_URL` (pooled), `DIRECT_URL` (direct/unpooled — **required**, migrations fail without it on Neon), `JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`.
4. Deploy. The `build` script runs `prisma migrate deploy` automatically, so the schema is created as part of the build — no manual migration step needed.
5. Seed demo data once, from any machine with normal internet access (not required, but useful to get the admin account and categories in place): `DATABASE_URL=<your connection string> npm run db:seed`.
6. Set `STORAGE_DRIVER=s3` and fill in the `S3_*` variables (see below) — a serverless deployment has no persistent disk, so the `local` storage driver **must not** be used in production.

> **Deploying from a non-default branch (e.g. reviewing a PR before merging):** Vercel only auto-builds branches that received a push *after* the GitHub integration was connected. If you import the repo while a branch/PR already exists, its first Preview deployment won't appear until either (a) you push a new commit to that branch, or (b) you change the project's **Production Branch** in Vercel's Git settings to point at it directly.

### Any Docker/VM host

1. `npm run build`
2. `npx prisma migrate deploy`
3. `npm run start` behind your reverse proxy of choice.
4. If you keep `STORAGE_DRIVER=local`, mount `/public/uploads` as a persistent volume so uploads survive restarts/redeploys.

### Enabling real SMS OTPs

Set `OTP_DEV_MODE=false` and wire your SMS provider (Twilio, MSG91, etc.) into the `else` branch of `requestOtp()` in `src/lib/otp.ts` — the OTP generation, hashing, and verification logic is already provider-agnostic.

### Enabling S3-compatible storage

Implement `S3StorageDriver.upload()` in `src/lib/storage.ts` using `@aws-sdk/client-s3` (or your provider's SDK) and set `STORAGE_DRIVER=s3` plus the `S3_*` env vars. No other code changes are required — every caller goes through `getStorage().upload()`.

## Future roadmap

The schema and API layer were designed so these can be added without a rewrite:

- **Real payment gateway** — the checkout UI already has an "Online payment" slot wired up and disabled; the `Payment` model and `Order.paymentMethod`/`paymentStatus` are ready for it.
- **Push/email/SMS notifications** — `src/lib/notify.ts` is a provider-agnostic seam (same pattern as OTP's dev-mode fallback); only the in-app `Notification` table is written today.
- **Real SMS OTP + S3-compatible storage** — both already have a working seam and dev-mode fallback; see the sections below.
- **AI store assistant** — a chat endpoint that reads a store's own `Product`/`Order` data.
- **WhatsApp ordering** — the "Chat" buttons already deep-link to WhatsApp; a Cloud API webhook can reuse the existing `/api/orders` and `/api/cart` endpoints.
- **Delivery partners** — the 8-state `OrderStatus` pipeline already has `READY`/`OUT_FOR_DELIVERY` states a rider-assignment model can hook into.
- **Open/broadcast product requests** — today a `ProductRequest` either targets one store or sits unrouted; letting a buyer's untargeted request fan out to multiple nearby sellers (first-available-responds) is a natural extension of the existing model.
- **A maintained Playwright end-to-end suite** — the Vitest suite (see [Testing](#testing)) covers server-side logic; a browser suite for the five personas (currently verified manually each milestone) is the natural next investment.
- **Loyalty points / ads platform** — additive models keyed off `User`/`Store`, no changes needed to existing tables.
- **Multi-city scale** — `Location`/`Store` already carry city/area/lat-lng; the nearby-stores query is a straightforward candidate for a geo-index (PostGIS) once catalog size demands it.
- **Native Android/iOS apps** — since the web app only talks to `src/app/api/**` over JSON, a native client is a new frontend on the same backend, not a new backend.

### Known MVP simplifications (by design, documented rather than hidden)

- A cart holds items from a **single store at a time** — matches a single-pickup delivery model and keeps checkout simple; adding from a second store prompts to replace the cart.
- A product variant selection (Size *or* Color) maps to **one** `ProductVariant` row per cart line rather than a full combinatorial SKU matrix — sufficient for most local retail catalogs; a dedicated SKU-combination table is a natural v2 addition.
- The manual "select your location" flow ships with a small curated city/area list; GPS-based location additionally attempts reverse-geocoding via OpenStreetMap Nominatim (free, no API key) and always lets the buyer confirm/override the result.
- A `ProductRequest` either targets one store or sits unrouted — there's no "broadcast to all nearby sellers" fan-out yet (see [Future roadmap](#future-roadmap)).
- `Payment` exists as a schema/API seam but no live payment gateway is wired up; every order today is Cash on Delivery.
