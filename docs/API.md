# API Reference

Every route lives under `src/app/api/**`, is wrapped in `withApiErrors` (consistent JSON error shape, the Origin/CSRF check, and rate-limit error mapping — see the [Security](../README.md#security) section of the README), validates its input with Zod, and enforces auth with `requireUser()`/`requireRole()`. A future native app, partner integration, or bot can reuse these endpoints as-is — the web app is just one client of this API.

Auth: **cookie** = the `cd_session` JWT cookie set by login; role in brackets is the minimum role required (`BUYER`/`SELLER`/`ADMIN`/`DELIVERY_PARTNER`), "any" means any authenticated role, "public" means no auth required.

## Auth

| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/auth/otp/request` | public | Rate-limited per phone and per IP. |
| `POST /api/auth/otp/verify` | public | Creates the account on first verify for a new phone+role. |
| `POST /api/auth/admin-login` | public | Rate-limited per phone and per IP. |
| `POST /api/auth/logout` | any | Revokes the current `Session` row. |
| `GET /api/auth/me` | any | Current user summary. |

## Catalog & discovery

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/categories` | public | Global business categories. |
| `GET /api/stores` | public | Discovery feed — `q`, `category`, `city`, `lat`/`lng`, `sort` (`recommended`/`nearest`/`top-rated`), `openNow`, `minRating`, `maxDistanceKm`, `page`. Paginated. |
| `GET /api/stores/[slug]` | public | Store detail + its visible product categories + products. |
| `GET /api/products` | public | Filterable product list (`storeId`, `categoryId`, `q`). |
| `GET /api/products/[id]` | public | Single product by id (buyer pages route by slug; this backs id-based lookups). |

## Cart & checkout

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/cart` | BUYER | Cart with computed line/subtotal/delivery/total (`src/lib/pricing.ts`). |
| `POST /api/cart/items` | BUYER | Add an item; `409 different_store` if the cart holds another store's items (client offers to replace). |
| `PATCH /api/cart/items/[id]` | BUYER | Update quantity (`0` deletes). |
| `DELETE /api/cart/items/[id]` | BUYER | Remove an item. |
| `GET /api/orders` | BUYER | The buyer's own orders. |
| `POST /api/orders` | BUYER | Places an order from the cart. Body accepts `couponCode` (applied to the subtotal first, re-validated from scratch server-side) and `redeemPoints` (loyalty points redeemed against what remains after the coupon, capped by balance and subtotal — ₹1 off per point). Rate-limited. Stock is decremented with a concurrency-safe conditional update (`stock >= qty` in the `WHERE` clause) inside the order transaction; notifies the seller (new order) and the buyer (order placed), and the seller again if stock crosses low/out. |
| `GET /api/orders/[id]` | buyer/seller owner or ADMIN | Order detail. |
| `PATCH /api/orders/[id]` | buyer/seller owner, assigned DELIVERY_PARTNER, or ADMIN | Status transition. Body: `{ status, reason? }`. Validated by the pure `canTransition()` state machine (`src/lib/order-status.ts`) — buyer can only move to `CANCELLED` (through `PENDING`/`CONFIRMED`); seller/admin drive the forward pipeline (`PENDING→…→READY`) and `REJECTED`; an assigned delivery partner can only advance `PICKED_UP→OUT_FOR_DELIVERY→DELIVERED` on orders assigned to them. Cancel/reject restores stock (`InventoryLog`, reason `RETURN`), writes an `AuditLog` row, and notifies the other party. A COD order's `Payment` is marked `PAID` automatically when it reaches `DELIVERED`. |
| `PATCH /api/orders/[id]/delivery-partner` | seller owner or ADMIN | Assign/unassign a delivery partner. Body: `{ deliveryPartnerId: string \| null }`; the target must be an admin-`APPROVED` partner. Not allowed once the order is `DELIVERED`/`CANCELLED`/`REJECTED`. |

## Payments

Every order gets a `Payment` row at creation (`src/lib/payment-gateway.ts` — a swappable `PaymentGateway` seam, `MockPaymentGateway` by default since no real gateway credentials exist yet). COD payments settle to `PAID` when the order is marked `DELIVERED`; ONLINE payments settle through the confirm endpoint below.

| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/payments/[id]/confirm` | buyer owner or ADMIN | Resolves an ONLINE payment's outcome via the configured gateway. Idempotent — a payment already `PAID`/`FAILED`/`REFUNDED` is returned as-is rather than re-processed; the actual DB transition uses a conditional `updateMany` guard (only `PENDING`/`PROCESSING` rows transition) to close the double-submit/duplicate-callback race. Body: `{ simulate?: "SUCCESS"\|"FAILED"\|"CANCELLED"\|"TIMEOUT" }` — a dev/sandbox-only hint the mock gateway honors so the checkout UI can exercise every outcome; a real gateway would ignore it and resolve the outcome from its own server-side state. Writes an `AuditLog` row on every transition. Rate-limited. |

## Reviews, wishlist, product requests (buyer)

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/reviews` | public | Filter by `storeId`/`productId`. |
| `POST /api/reviews` | BUYER | Requires a `DELIVERED` order the buyer owns; one review per order (DB-enforced). Rate-limited. Optional `imageUrl`. |
| `GET /api/wishlist` | BUYER | The buyer's saved products. |
| `POST /api/wishlist` | BUYER | `{ productId }`; idempotent. |
| `DELETE /api/wishlist/[productId]` | BUYER | Remove. |
| `GET /api/product-requests` | BUYER | The buyer's own requests. |
| `POST /api/product-requests` | BUYER | Create a request; notifies the store owner if one was targeted. Rate-limited. |
| `PATCH /api/product-requests/[id]` | BUYER | `{ decision: "ACCEPTED" | "DECLINED" }`, only while `RESPONDED`. |

## Loyalty

Buyers earn 1 point per ₹100 spent (`src/lib/loyalty.ts`), credited when an order reaches `DELIVERED` and refunded if a points-funded order is later cancelled/rejected. The rate is hardcoded until `PlatformSetting` exists (Milestone 10) — same seam pattern as commission's default percentage.

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/loyalty` | any | The caller's points balance + last 20 transactions. |

## Coupons

Seller-scoped coupons (`Coupon`); a "flash sale"/"festival sale" is just a coupon with a promotional name and a short date window — no separate offers entity. Validation (dates, usage limit, min order, one redemption per buyer) is the pure `validateCoupon()` in `src/lib/coupon.ts`.

| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/coupons/validate` | BUYER | Preview-only: `{ code, storeId, subtotal }` → `{ valid, discountAmount }`. The order-creation route re-validates independently and never trusts this response. |
| `GET/POST /api/seller/coupons` | SELLER | List own coupons (with redemption count) / create one. |
| `PATCH/DELETE /api/seller/coupons/[id]` | SELLER (own) | Toggle `isActive`, extend `endDate`/`usageLimit`, or delete. |

## Location

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/location` | any | The user's saved/current addresses. |
| `POST /api/location` | any | Add an address (full form: name, phone, address line, landmark, area, city, state, pincode, delivery instructions). |

## Notifications (buyer + seller)

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/notifications` | any | Latest 30 + unread count. |
| `POST /api/notifications` | any | Mark all read. |
| `PATCH /api/notifications/[id]` | any | Mark one read. |

## Uploads

| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/upload` | any | Multipart form (`file`, `folder` ∈ `stores`/`products`/`avatars`/`reviews`/`requests`/`documents`). MIME allowlist + 10MB cap + magic-byte signature check. Rate-limited. |

## Seller

| Method & path | Auth | Notes |
|---|---|---|
| `GET/POST /api/seller/store` `PATCH /api/seller/store` | SELLER | Registration + settings, including the per-day `hours` array, `vacationMode`/`vacationUntil`, `minOrderAmount`. |
| `GET/POST /api/seller/documents` `DELETE /api/seller/documents/[id]` | SELLER | Verification document uploads (`type` ∈ `SHOP_PROOF`/`GST`/`FSSAI`/`BUSINESS_CERTIFICATE`, `url` from `/api/upload` with `folder=documents`). Reviewed by admin, who sets `Store.isVerified` — kept separate from the `status` approval gate. |
| `GET/POST /api/seller/products` | SELLER | Own catalog; slugs are globally unique. |
| `GET/PATCH/DELETE /api/seller/products/[id]` | SELLER (own store) | PATCH writes an `AuditLog` row on a price change; DELETE writes one too. |
| `GET/POST /api/seller/product-categories` | SELLER | In-store nav categories. |
| `PATCH/DELETE /api/seller/product-categories/[id]` | SELLER (own store) | Rename/hide/reorder or delete. |
| `GET /api/seller/inventory` | SELLER | `?filter=all\|low\|out`; totals per product/variant. |
| `POST /api/seller/inventory/adjust` | SELLER | `{ productId, variantId?, delta, note? }`; writes `InventoryLog` and may trigger a low-stock notification. |
| `GET /api/seller/inventory/[productId]/history` | SELLER (own store) | Stock-change ledger for one product. |
| `GET /api/seller/orders` | SELLER | `?group=new\|accepted\|completed\|cancelled`. |
| `GET /api/seller/customers` | SELLER | Aggregated buyer stats for the store. |
| `GET /api/seller/dashboard` | SELLER | Summary tiles + recent orders. |
| `GET /api/seller/analytics` | SELLER | `?range=today\|7d\|30d`; daily orders/revenue series, totals, low-stock count, pending-request count, new/returning customer counts. `productAnalytics` (views/cart-adds/purchases/conversion per product) and `customerAnalytics.topCustomers` are gated behind the `advancedAnalytics` plan feature (PREMIUM) — empty arrays with `advancedAnalytics: false` otherwise. |
| `GET /api/seller/product-requests` | SELLER | Requests directed at the store. |
| `PATCH /api/seller/product-requests/[id]` | SELLER (own store) | Respond available/unavailable + price/message, optionally attach an existing product; notifies the buyer. |

## Subscriptions

New sellers get a 14-day `TRIAL` GROWTH subscription on store registration. `hasFeature()`/`getPlanFeatures()` (`src/lib/subscription.ts`) lazily flip an expired `ACTIVE`/`TRIAL` row to `EXPIRED` on read (no cron) and fall back to `STARTER`'s feature set once expired — a lapsed plan downgrades rather than locks the store out. Gated today: product-count limit (`POST /api/seller/products`) and WhatsApp sends (`createNotification`'s `storeId` param, GROWTH+ only).

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/subscription-plans` | any | The 3 seeded plans (STARTER/GROWTH/PREMIUM) with pricing + feature map. |
| `GET/PATCH /api/seller/subscription` | SELLER | Own subscription (+ live product count). PATCH `{ planKey }` — an immediate, no-proration switch that starts a fresh 30-day cycle (no real gateway is wired up for recurring billing yet). |
| `GET /api/admin/subscription-plans` `PATCH /api/admin/subscription-plans/[id]` | ADMIN | Edit a plan's price/feature map. |
| `GET /api/admin/subscriptions` | ADMIN | Every seller's subscription, with store + plan. `?status=`. |

## AI assistant

`src/lib/ai.ts` exports an `AIProvider` interface (`generate(task: AITask): Promise<string>`) with a deterministic `TemplateAIProvider` default — no external LLM call, but real, varied prose built from the actual product/store/metrics data passed in, not lorem-ipsum. `getAIProvider()` is a factory function (module-level singleton), ready to swap in a real OpenAI/Claude-backed provider later via an env var with zero call-site changes. All three endpoints below are gated behind `hasFeature(storeId, "ai")` (GROWTH plan and above) and return `403` with an upgrade message otherwise.

| Method & path | Auth | Notes |
|---|---|---|
| `POST /api/seller/ai/product-description` | SELLER, GROWTH+ | `{ name, category?, price, attributes? }` → `{ text }`. Used by the "Generate with AI" button on the product form. |
| `POST /api/seller/ai/marketing-content` | SELLER, GROWTH+ | `{ occasion?, highlight? }` → `{ text }`, woven with the store's own name. Used by the dashboard's marketing-content generator. |
| `GET /api/seller/ai/insights` | SELLER, GROWTH+ | Computes real 30-day vs. previous-30-day revenue/order metrics, top product, and low-stock count from the store's own orders, then returns `{ text }` — a templated summary (growth/decline %, a coupon suggestion on decline, low-stock mentions). Powers the dashboard's AI insight card. |

## Support

Any authenticated user (buyer, seller, or delivery partner) can raise a ticket; only ADMIN resolves them. The opening message is stored as the ticket's first reply, so the thread is a single uniform list. A user reply on a `RESOLVED` ticket reopens it to `OPEN`; a `CLOSED` ticket rejects further user replies with `400` until an admin reopens it. An admin's first reply on an `OPEN` ticket auto-advances it to `IN_PROGRESS` and sends the user a `SUPPORT_TICKET_REPLY` notification.

| Method & path | Auth | Notes |
|---|---|---|
| `GET/POST /api/support/tickets` | any authenticated user | List/create own tickets. `POST { subject, category, message, relatedOrderId? }`. |
| `GET /api/support/tickets/[id]` | owner only | 404 (not 403) if the ticket belongs to someone else. |
| `POST /api/support/tickets/[id]/replies` | owner only | `{ message }`; rejected with `400` on a `CLOSED` ticket. |
| `GET /api/admin/support-tickets` `?status=` | ADMIN | All tickets, with the requester's name/phone/role and latest reply preview. |
| `GET/PATCH /api/admin/support-tickets/[id]` | ADMIN | Full thread; PATCH `{ status }` writes an `AuditLog` row. |
| `POST /api/admin/support-tickets/[id]/replies` | ADMIN | `{ message }`; notifies the ticket's owner. |

## Commissions

Every order snapshots `platformFee`/`sellerEarning` at creation time (`src/lib/pricing.ts`'s `computeCommission()`, fed by `resolveCommissionForStore()` — store-specific beats category beats global beats a hardcoded 10% default) and never recomputes them later, same immutability principle as `OrderItem.price`. Commission is taken from the product subtotal only; delivery charges pass straight through to the seller.

| Method & path | Auth | Notes |
|---|---|---|
| `GET/POST /api/admin/commission-rules` | ADMIN | List/create. `{ scope: "GLOBAL"\|"CATEGORY"\|"STORE", categoryId?, storeId?, percentage }` — one rule per scope/target, a duplicate is rejected (edit or delete the existing one instead). |
| `PATCH/DELETE /api/admin/commission-rules/[id]` | ADMIN | Edit the percentage, or remove the rule. |

## Delivery (delivery partner role)

A `DELIVERY_PARTNER` account follows the same OTP-login + approval-gate pattern as a seller: register (`POST /api/delivery/profile`) after first login, then wait for admin approval before `/delivery/*` pages unlock (mirrors `Store`'s `PENDING→APPROVED` gate, via the `DeliveryPartner` model). Assignment is platform-wide — any seller can assign any admin-approved partner to their order (no geo-matching yet).

| Method & path | Auth | Notes |
|---|---|---|
| `GET/PATCH /api/delivery/profile` `POST /api/delivery/profile` | DELIVERY_PARTNER | Own profile: `vehicleType`, `isAvailable` toggle. POST registers (409 if one already exists). |
| `GET /api/delivery/orders` | DELIVERY_PARTNER | Orders assigned to the caller. `?group=active\|completed`. |
| `GET /api/seller/delivery-partners` | SELLER | The assignment pool — every admin-`APPROVED` delivery partner. |

## Admin

| Method & path | Auth | Notes |
|---|---|---|
| `GET/POST /api/admin/categories` `PATCH/DELETE /api/admin/categories/[id]` | ADMIN | Global categories. |
| `GET /api/admin/stores` `GET/PATCH /api/admin/stores/[id]` | ADMIN | List/detail (detail includes `documents`); PATCH body `{ status?, rejectionReason?, isVerified? }` — `status` now also accepts `UNDER_REVIEW` (PENDING→UNDER_REVIEW→APPROVED/REJECTED); `isVerified` is independent of `status`. Writes an `AuditLog` row per field changed. |
| `GET /api/admin/users` `PATCH /api/admin/users/[id]` | ADMIN | Activate/deactivate; writes an `AuditLog` row. |
| `GET /api/admin/delivery-partners` `PATCH /api/admin/delivery-partners/[id]` | ADMIN | Approve/reject/suspend delivery partner applications; writes an `AuditLog` row. |
| `GET /api/admin/orders` | ADMIN | All orders, platform-wide. |
| `GET /api/admin/stats` | ADMIN | Platform overview tiles. |
| `GET /api/admin/payments` `?status=` | ADMIN | Every payment platform-wide, with its order/store/buyer. |
| `GET /api/admin/reports` | ADMIN | 30-day revenue/commission/order totals + daily series, active-seller/buyer/delivery-partner counts, open-ticket count, active-subscription breakdown by plan, and top 5 stores by revenue — the consolidated cross-milestone reports overview. |

## Refunds & seller payouts

Both are tracking ledgers only — creating a `Refund` or `Payout` row never moves real money; there's no payment-gateway refund API or bank/UPI payout integration wired up (no real gateway exists in this sandbox — see `src/lib/payment-gateway.ts`). An admin who has actually refunded/paid someone through a real channel records it here for the books.

A `Refund`'s amount is capped server-side at the payment's refundable balance (`amount` minus every prior `COMPLETED` refund on it — `src/lib/refund.ts`'s `computeRefundableBalance()`); a `COMPLETED` refund flips `Payment.status` to `REFUNDED` (fully covered) or `PARTIALLY_REFUNDED` otherwise. A `Payout`'s amount is capped at the store's outstanding balance (lifetime `sellerEarning` across revenue-counted orders, minus every prior `PAID` payout — `src/lib/payout.ts`'s `computeOutstandingBalance()`); `PENDING`/`PROCESSING`/`ON_HOLD`/`FAILED` payouts don't reduce the balance, only `PAID` does, so multiple payouts can be queued before any of them lands.

| Method & path | Auth | Notes |
|---|---|---|
| `GET /api/admin/refunds` `?paymentId=` | ADMIN | List refunds, optionally for one payment. |
| `POST /api/admin/refunds` | ADMIN | `{ paymentId, amount, reason? }` — rejected if the payment isn't `PAID`/`PARTIALLY_REFUNDED` or the amount exceeds the refundable balance. Starts `REQUESTED`. |
| `PATCH /api/admin/refunds/[id]` | ADMIN | `{ status: "PROCESSING" \| "COMPLETED" \| "FAILED" }` — only while the refund hasn't already reached a final state. `COMPLETED` updates the payment's status and `refundedAt`. Writes an `AuditLog` row. |
| `GET /api/admin/payouts` `?storeId=` | ADMIN | List payouts, optionally for one store. |
| `GET /api/admin/payouts/balances` | ADMIN | Every approved store with an outstanding balance > 0, sorted highest first. |
| `POST /api/admin/payouts` | ADMIN | `{ storeId, amount, periodStart, periodEnd, notes? }` — rejected if the amount exceeds the store's outstanding balance. Starts `PENDING`. |
| `PATCH /api/admin/payouts/[id]` | ADMIN | `{ status: "PENDING" \| "PROCESSING" \| "PAID" \| "FAILED" \| "ON_HOLD" }`; marking `PAID` stamps `processedById`. Writes an `AuditLog` row. |
| `GET /api/seller/payouts` | SELLER | Own store's lifetime earnings, outstanding balance, and full payout history (read-only). |

## Platform settings & feature flags

Tunables that used to be hardcoded constants (`src/lib/settings.ts`'s `SETTINGS_CATALOG`) — commission default %, loyalty ₹-per-point rate, new-seller trial length, platform name — now read through `getSetting()`/`getSettingNumber()`, which fall back to the same hardcoded value when no `PlatformSetting` row exists yet, so a lapsed/never-configured platform behaves exactly as before. Feature flags (`src/lib/feature-flags.ts`'s `FEATURE_FLAG_CATALOG`) are booleans checked on real request paths — `ai_assistant` (the 3 seller AI endpoints), `online_payments` (checkout's `ONLINE` method), `coupons` (coupon application at checkout), `reviews` (review creation), `delivery_partner_assignment` (assigning a partner to an order) — a missing `FeatureFlag` row means enabled, so every flag defaults to today's behavior until an admin flips it off.

| Method & path | Auth | Notes |
|---|---|---|
| `GET/PATCH /api/admin/settings` | ADMIN | GET returns the full catalog merged with any stored overrides. PATCH `{ key, value }` upserts one setting; writes an `AuditLog` row. |
| `GET/PATCH /api/admin/feature-flags` | ADMIN | GET returns every known flag with its effective state. PATCH `{ key, isEnabled }` upserts one flag; writes an `AuditLog` row. |
