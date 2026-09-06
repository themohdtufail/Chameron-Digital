# Chameron Digital

**Your local market, now online.**

Chameron Digital is a local-commerce platform that gives every local business its own digital storefront and lets nearby customers discover, browse, and order from them. This repository contains the Phase 1 MVP: a buyer experience, a seller experience, and an admin foundation, built on production-grade architecture designed to scale.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Architecture overview](#architecture-overview)
3. [Database schema](#database-schema)
4. [Local setup](#local-setup)
5. [Test accounts](#test-accounts)
6. [Feature tour](#feature-tour)
7. [Security](#security)
8. [Deployment guide](#deployment-guide)
9. [Future roadmap](#future-roadmap)

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
      (app)/              # bottom-nav app shell: home, categories, orders, profile,
                          # store/[slug], cart, checkout, order/[id]
      product/[id]/       # full-screen product detail (own layout, no bottom nav)
    seller/              # Seller-only routes
      login/ register/ pending/
      (app)/              # dashboard, products, orders, customers, settings
    admin/               # Admin-only routes
      login/
      (app)/              # dashboard, sellers, categories, users, orders
  components/            # Reusable UI, grouped by domain (ui/, buyer/, seller/, admin/, auth/)
  lib/                   # db client, auth/session, otp, storage, validation, utils
  middleware.ts          # Edge middleware enforcing role-based route access
prisma/
  schema.prisma          # Full data model
  seed.ts                # Demo data + test accounts
```

**Why this structure holds up at scale:**

- **Route groups per role** (`(app)`) let each experience have its own shell/navigation without leaking into the others, while `middleware.ts` enforces at the edge that a buyer session can never reach `/seller/*` or `/admin/*` and vice versa.
- **The API layer is the real backend.** Every mutation goes through `src/app/api/**`, validated with Zod and authorized with `requireUser`/`requireRole`. This means a future native mobile app, a partner integration, or a WhatsApp bot can reuse the exact same endpoints — the web app is just one client of the API.
- **Storage is an interface** (`src/lib/storage.ts`), not a hard dependency on the filesystem. Swapping to S3/Cloudflare R2 for production is a one-file change.
- **The database schema separates concerns that will each become their own bounded context** as the platform grows (catalog, orders, identity, location) — see below.

## Database schema

Defined in [`prisma/schema.prisma`](./prisma/schema.prisma). Key models:

| Model | Purpose |
|---|---|
| `User` | Single identity table with a `role` (`BUYER` / `SELLER` / `ADMIN`). Phone is the unique login key. |
| `OtpCode` | Short-lived, hashed OTP codes with attempt limiting. |
| `Session` | Server-tracked sessions (hashed token) so a session can be revoked; the JWT cookie references it by id. |
| `Location` | A buyer's saved/current addresses **and** the shipping address snapshot source for orders. |
| `Category` | Admin-managed business categories (Fashion, Food, Electronics, …). |
| `ProductCategory` | Seller-defined in-store navigation (Men, Women, Kids, Offers). |
| `Store` | A seller's digital storefront — profile, location, hours, delivery settings, and an approval `status`. |
| `Product` / `ProductImage` / `ProductVariant` | Catalog, with multi-image support and Size/Color/Material variants. |
| `Cart` / `CartItem` | One active cart per buyer. Items are constrained to a single store at a time (checkout maps 1 cart → 1 order → 1 store, matching a single-pickup delivery run). |
| `Order` / `OrderItem` | Immutable snapshots of price/name/variant at time of purchase, so catalog edits never change historical orders. |
| `Review` | Buyer ratings/comments, rolled up into `Store.ratingAvg`. |

Run `npx prisma studio` any time to browse the live data visually.

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

Edit `.env` — at minimum set `DATABASE_URL` to your Postgres instance. Everything else has a sensible dev default:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/chameron_digital"
JWT_SECRET="replace-with-a-long-random-secret"
ADMIN_PHONE="+911234567890"
ADMIN_PASSWORD="ChameronAdmin@123"
OTP_DEV_MODE="true"          # OTPs are printed to the server console instead of sent via SMS
OTP_DEV_STATIC_CODE="123456"  # ...and this code always works in dev mode
STORAGE_DRIVER="local"        # uploads are written to /public/uploads
```

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

**Buyer:** splash → role picker → OTP login → location (GPS with reverse-geocoding, or manual city/area search with graceful fallback) → home (nearby/popular stores, categories) → store page (banner, ratings, call/chat/share, category tabs, search) → product detail (gallery, video, variants, quantity, add to cart / buy now) → cart → checkout (saved addresses, COD, an "Online payment — coming soon" placeholder) → order confirmation → order tracking with a status timeline → reviews on completed orders.

**Seller:** OTP login → store registration (logo/cover upload, category, address) → pending-approval screen → dashboard (today's orders, sales, products, customers, open/closed toggle) → product management (multi-photo + video upload, variants, specifications, stock, hide/unhide, delete) → order management (accept / reject / start preparing / complete) → customers list → store settings (hours, delivery fee, contact).

**Admin:** password login → platform overview → approve/reject/suspend stores → manage global categories → view/deactivate users → view all orders across the platform.

## Security

- **Password-less buyer/seller auth** via mobile OTP (hashed, rate-limited, single-use, 5-minute expiry); admin uses bcrypt-hashed passwords.
- **Session cookies** are `httpOnly`, `sameSite=lax`, signed JWTs (HS256), and reference a server-side `Session` row so they can be revoked on logout.
- **Role-based access control** enforced twice: at the edge in `middleware.ts` (route-level redirect) and again in every API handler via `requireRole()` (so a crafted request can't bypass the UI).
- **Ownership checks everywhere**: a seller can only read/mutate their own store, products, and orders; a buyer can only see their own cart/orders/addresses.
- **All input is validated with Zod** at the API boundary before touching the database.
- **Server-side price recomputation** at checkout — the client never gets to say what an order costs.
- **Upload validation**: file type allowlist and a 10MB size cap before anything touches storage.

## Deployment guide

The app is a standard Next.js application and deploys cleanly to any Node host. A common path:

### Vercel + managed Postgres (fastest)

1. Push this repo to GitHub.
2. Create a Postgres database (Vercel Postgres, Neon, Supabase, or RDS all work) and copy its connection string.
3. Import the repo into Vercel and set the environment variables from `.env.example` (in particular `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`) in the Vercel project settings **before** the first deploy.
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

- **AI store assistant** — a chat endpoint that reads a store's own `Product`/`Order` data.
- **WhatsApp ordering** — the "Chat" button on every store page already deep-links to WhatsApp; a Cloud API webhook can reuse the existing `/api/orders` and `/api/cart` endpoints.
- **Delivery partners** — `Order` already carries a status pipeline (`PENDING → CONFIRMED → PREPARING → COMPLETED`) that a rider-assignment model can hook into.
- **Real payment gateway** — the checkout UI already has an "Online payment" slot wired up and disabled; `Order.paymentMethod`/`paymentStatus` are ready for it.
- **Loyalty points / ads platform** — additive models keyed off `User`/`Store`, no changes needed to existing tables.
- **Multi-city scale** — `Location`/`Store` already carry city/area/lat-lng; the nearby-stores query is a straightforward candidate for a geo-index (PostGIS) once catalog size demands it.
- **Native Android/iOS apps** — since the web app only talks to `src/app/api/**` over JSON, a native client is a new frontend on the same backend, not a new backend.

### Known MVP simplifications (by design, documented rather than hidden)

- A cart holds items from a **single store at a time** — matches a single-pickup delivery model and keeps checkout simple; adding from a second store prompts to replace the cart.
- A product variant selection (Size *or* Color) maps to **one** `ProductVariant` row per cart line rather than a full combinatorial SKU matrix — sufficient for most local retail catalogs; a dedicated SKU-combination table is a natural v2 addition.
- The manual "select your location" flow ships with a small curated city/area list; GPS-based location additionally attempts reverse-geocoding via OpenStreetMap Nominatim (free, no API key) and always lets the buyer confirm/override the result.
