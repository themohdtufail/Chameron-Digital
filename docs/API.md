# API Reference

Every route lives under `src/app/api/**`, is wrapped in `withApiErrors` (consistent JSON error shape, the Origin/CSRF check, and rate-limit error mapping — see the [Security](../README.md#security) section of the README), validates its input with Zod, and enforces auth with `requireUser()`/`requireRole()`. A future native app, partner integration, or bot can reuse these endpoints as-is — the web app is just one client of this API.

Auth: **cookie** = the `cd_session` JWT cookie set by login; role in brackets is the minimum role required (`BUYER`/`SELLER`/`ADMIN`), "any" means any authenticated role, "public" means no auth required.

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
| `POST /api/orders` | BUYER | Places an order from the cart. Rate-limited. Stock is decremented with a concurrency-safe conditional update (`stock >= qty` in the `WHERE` clause) inside the order transaction; notifies the seller (new order) and the buyer (order placed), and the seller again if stock crosses low/out. |
| `GET /api/orders/[id]` | buyer/seller owner or ADMIN | Order detail. |
| `PATCH /api/orders/[id]` | buyer/seller owner or ADMIN | Status transition. Body: `{ status, reason? }`. Validated by the pure `canTransition()` state machine (`src/lib/order-status.ts`) — buyer can only move to `CANCELLED` (through `PENDING`/`CONFIRMED`); seller/admin drive the forward pipeline and `REJECTED`. Cancel/reject restores stock (`InventoryLog`, reason `RETURN`), writes an `AuditLog` row, and notifies the other party. |

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
| `POST /api/upload` | any | Multipart form (`file`, `folder` ∈ `stores`/`products`/`avatars`/`reviews`/`requests`). MIME allowlist + 10MB cap + magic-byte signature check. Rate-limited. |

## Seller

| Method & path | Auth | Notes |
|---|---|---|
| `GET/POST /api/seller/store` `PATCH /api/seller/store` | SELLER | Registration + settings, including the per-day `hours` array, `vacationMode`/`vacationUntil`. |
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
| `GET /api/seller/analytics` | SELLER | `?range=today\|7d\|30d`; daily orders/revenue series, totals, low-stock count, pending-request count. |
| `GET /api/seller/product-requests` | SELLER | Requests directed at the store. |
| `PATCH /api/seller/product-requests/[id]` | SELLER (own store) | Respond available/unavailable + price/message, optionally attach an existing product; notifies the buyer. |

## Admin

| Method & path | Auth | Notes |
|---|---|---|
| `GET/POST /api/admin/categories` `PATCH/DELETE /api/admin/categories/[id]` | ADMIN | Global categories. |
| `GET /api/admin/stores` `PATCH /api/admin/stores/[id]` | ADMIN | Approve/reject/suspend; writes an `AuditLog` row. |
| `GET /api/admin/users` `PATCH /api/admin/users/[id]` | ADMIN | Activate/deactivate; writes an `AuditLog` row. |
| `GET /api/admin/orders` | ADMIN | All orders, platform-wide. |
| `GET /api/admin/stats` | ADMIN | Platform overview tiles. |
