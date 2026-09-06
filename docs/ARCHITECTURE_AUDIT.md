# Chameron Digital — Architecture Audit (pre–Phase 3 continuation)

Snapshot as of `claude/chameron-digital-mvp-bq2mg5` at commit `3b7caf0`. Written before any further code changes, per the Phase 3 brief's own instruction to audit first.

## 1. Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14.2 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers (`src/app/api/**`) — no separate backend service |
| Database | PostgreSQL via Prisma 6.19 ORM. Local dev: plain Postgres. Deployed: Neon (pooled `DATABASE_URL` + unpooled `DIRECT_URL` for migrations) |
| Auth | Custom OTP (dev-mode static code) + JWT session cookie (`httpOnly`, `secure` in prod, `sameSite=lax`) for buyer/seller/delivery-partner; phone+password for admin |
| Storage | `StorageDriver` interface (`src/lib/storage.ts`) — `local` (writes to `/public/uploads`) implemented, `s3` stubbed but not wired to real AWS credentials |
| API architecture | REST-ish JSON routes, one `withApiErrors()` wrapper standardizing Zod/Auth/RateLimit errors, defense-in-depth CSRF via same-origin check (session cookie is the primary defense) |
| Hosting | Vercel (Preview per-branch, Production on `main`) |

## 2. Roles & routes

Four roles: `BUYER`, `SELLER`, `ADMIN`, `DELIVERY_PARTNER`. `src/middleware.ts` gates `/buyer/*`, `/seller/*`, `/admin/*`, `/delivery/*` by session role, redirecting to that section's login otherwise. Every API route additionally calls `requireRole()`/`requireUser()` itself — the middleware is not the only enforcement layer.

- **Buyer**: home, categories, search, store/product pages, cart, checkout, orders, wishlist, loyalty, product requests, support tickets, notifications, profile.
- **Seller**: dashboard, products, categories, inventory, orders, requests, analytics, customers, coupons, subscription plans, verification, support, settings, AI assistant panel.
- **Delivery partner**: registration/approval gate, assigned-deliveries list + detail, status-advance actions scoped to their own assignments.
- **Admin**: dashboard, sellers (approve/reject/suspend + document review), delivery partners, subscriptions/plans, commission rules, payments, reports, support inbox, categories, users, orders.

## 3. Order system

`Order` is an 8-state machine (`PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED`, plus `CANCELLED`/`REJECTED`), transitions enforced by a pure, unit-tested function (`src/lib/order-status.ts`) with per-actor-role legality (buyer can only cancel early states; delivery partner can only advance `PICKED_UP→OUT_FOR_DELIVERY→DELIVERED` on their own assigned orders). Every order snapshots price, discount, commission, and seller-earning at creation time — nothing is recomputed later, matching the brief's "server recalculates everything, nothing trusts the client" requirement already. Stock decrements use a conditional `updateMany` (`WHERE stock >= qty`) to close the double-checkout race.

## 4. Seller system

Store → Products (with variants, images, inventory tracking) → Orders. Seller onboarding creates a 14-day trial `GROWTH` subscription automatically. Feature gating (`hasFeature(storeId, key)`) drives product-count limits, AI-endpoint access, WhatsApp-template sends, and advanced-analytics depth by plan. Seller verification is a `StoreDocument` upload + admin review flow, independent of the approval gate that lets a store go live.

## 5. Admin system

Centralized management of sellers, delivery partners, subscriptions/plans, commission rules (global/category/store precedence), payments, users, orders, and support tickets, plus a cross-cutting reports overview (30-day revenue/commission trend, active-subscription breakdown, top stores, open-ticket count). Every mutating admin action writes an `AuditLog` row (actor, action, entity, metadata).

## 6. Deployment configuration

Vercel project `chameron-digital` (team `themohdtufail`), auto-deploying `main` (Production) and PR branches (Preview). Framework preset, env-var scoping (Production/Preview/Development), and a peer-dependency conflict were all broken as of this session's start — all three are now fixed (see commits `110cffe`, and the env-var/framework fixes applied directly via the Vercel API/CLI this session). `npm run build` runs `prisma migrate deploy && next build`, so every deploy applies pending migrations before building.

## 7. Environment variables (current)

`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN_DAYS` (defaulted, not set), `ADMIN_PHONE`, `ADMIN_PASSWORD`, `OTP_DEV_MODE`, `OTP_DEV_STATIC_CODE`, `STORAGE_DRIVER`, plus unused-so-far `S3_*` and `NEXT_PUBLIC_APP_*`. No staging environment exists — only local dev, Vercel Preview (per-PR), and Vercel Production (`main`). No secrets are committed; `.env*` is fully gitignored.

## 8. Security controls already in place

- RBAC at both middleware and per-route layers; every list/detail query filters by `storeId`/`buyerId`/`userId`/assigned-partner — audited for IDOR across all milestones this session.
- Rate limiting (DB-backed fixed window) on OTP request/verify, admin login, order creation, reviews, uploads, support-ticket create/reply, product requests, and payment confirmation.
- File uploads: 10MB cap, MIME allowlist, **and** magic-byte signature verification (`src/lib/file-signature.ts`) so a relabeled malicious file is rejected even if its declared Content-Type looks fine.
- Session cookies: `httpOnly`, `secure` in production, `sameSite=lax`.
- CSRF: same-origin check on all mutating requests (defense-in-depth on top of `sameSite=lax`).
- Payment confirmation is idempotent and server-only — status can't be set by client-submitted fields, transitions are guarded by conditional `updateMany` inside a transaction, every transition is audit-logged.

## 9. Security gaps (real, not yet addressed)

- **No security headers** — `next.config.mjs` sets none (no CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- **No MFA/2FA** for seller or admin accounts.
- **No structured audit coverage for login/logout events** — audit log exists but isn't called from the auth routes themselves yet.
- **No fraud/risk-flag detection** (repeated failed payments, coupon abuse patterns, etc.).
- **No dependency vulnerability scanning** wired into CI (there is no CI workflow file in the repo at all yet).

## 10. Third-party integrations

None are live. Every "external" concern is a provider-agnostic seam with a deterministic, no-network default, ready for a real credential to be dropped in later without touching call sites:

| Concern | Seam | Real provider wired? |
|---|---|---|
| Payment gateway | `src/lib/payment-gateway.ts` (`MockPaymentGateway`) | No — no Razorpay/Stripe keys exist in this sandbox |
| Object storage | `src/lib/storage.ts` (`local` driver; `s3` driver stubbed) | No — no AWS credentials |
| WhatsApp | `src/lib/notify.ts` (`sendWhatsApp()` logs in dev) | No — no WhatsApp Business API credentials |
| SMS/OTP | `src/lib/otp.ts` (dev-mode static code) | No — no SMS provider credentials |
| AI | `src/lib/ai.ts` (`TemplateAIProvider`) | No — no OpenAI/Claude API key configured for the app itself |
| Push (FCM), Email, Sentry, CDN/WAF/DNS | Not started | No |

## 11. What Phase 3's brief asks for vs. what already exists

A large fraction of the 56-part brief was already built this session under an earlier, similarly-scoped Phase 3 plan (9 of that plan's 12 milestones shipped, a 10th in progress). Mapping the new brief's parts against it:

**Already substantially built** (Parts 5, 7, 8, 9 in-app channel, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, and half of 23): payment tracking + mock gateway, delivery pipeline + delivery-partner role, in-app notifications + WhatsApp seam, seller subscriptions, seller verification/KYC, commission engine, seller analytics, coupons, loyalty points, wishlist back-in-stock/price-drop, AI assistant (edit-before-use, never auto-applies), support tickets, admin control center, platform settings (in progress right now).

**Genuinely missing, code-only (no external credentials needed)**: refund tracking as its own entity (Part 6), seller payout tracking (Part 15), multi-city `City`/`Area` tables (Part 24), security headers (part of 25), login/logout audit-log coverage (part of 30), search ranking improvements (Part 42), feature-flag system completion (Part 39, in progress), background-job seam (Part 41), a real integration-test layer beyond the current pure-logic unit suite (part of 49).

**Blocked on real external accounts/decisions from you** (I'll build the seam, not fake the integration): Razorpay keys (Part 5's "real gateway"), AWS/S3/CloudFront/Route53/WAF (Parts 2–4), FCM project (Part 10), Sentry DSN (Part 31), a domain name (Part 3), a CI provider beyond Vercel's own build gate (Part 37), a staging Postgres instance separate from the dev/prod ones that exist today (Part 38).

**Process/documentation items, not code** (Parts 45, 46, 53–56): legal pages, data-retention policy, a formal environment checklist, cost-monitoring alerts, a penetration test — these need your input (what the actual policy text should say) more than they need me to write code.

## 12. Recommended next milestone (pending your confirmation)

Given the above, the highest-value work I can do *without* waiting on external credentials, in order:

1. Finish Platform Settings + Feature Flags (already in progress).
2. Refund tracking (`Refund` model, admin-initiated full/partial refund against a `Payment`, status machine).
3. Seller payout tracking (`Payout` model, computed from `sellerEarning` minus recorded payouts, admin-visible ledger — no real money movement without a real payout provider).
4. Security headers in `next.config.mjs`, plus login/logout audit-log calls.
5. Multi-city (`City`/`Area` tables, nullable FKs, seeded Jammu + placeholder cities) — matches the brief's explicit "don't hardcode Jammu" instruction.
6. Search relevance pass + a documented Elasticsearch/Algolia swap-in point.

I'd rather confirm this order (or take a different one) with you before spending the next several hours of work on it, given how large the full brief is.
