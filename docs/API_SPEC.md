# REST API Specification (/api/v1)

## Base URL
`http://localhost:5000/api/v1`

---

## 1. Authentication (`/auth`)
- `POST /auth/register`
  - Body: `{ email, password, name, role?: "CUSTOMER" | "VENDOR" }`
  - Returns: `{ user, accessToken }` + HTTP-only `refreshToken` cookie.
- `POST /auth/login`
  - Body: `{ email, password }`
  - Returns: `{ user, accessToken }` + HTTP-only `refreshToken` cookie.
- `POST /auth/refresh`
  - Cookie: `refreshToken`
  - Returns: `{ accessToken }` + rotated `refreshToken` cookie.
- `POST /auth/logout`
  - Invalidates current refresh token in database, clears cookie.
- `GET /auth/me`
  - Header: `Authorization: Bearer <accessToken>`
  - Returns current user profile, vendor profile if exists.

---

## 2. Vendors (`/vendors` & `/admin/vendors`)
- `POST /vendors/apply` (Customer/Auth required)
  - Body: `{ storeName, description, contactPhone? }`
  - Creates VendorProfile with status `PENDING`.
- `GET /vendors/me` (Vendor required)
  - Returns vendor's store details, status, payoutAccountId, settings.
- `PATCH /vendors/me` (Vendor required)
  - Updates storeName, description, payoutAccountId.
- `GET /admin/vendors` (Admin required)
  - Query: `?status=PENDING|APPROVED|SUSPENDED&page=1&limit=20`
  - Returns list of vendor applications with user info.
- `PATCH /admin/vendors/:id/status` (Admin required)
  - Body: `{ status: "APPROVED" | "SUSPENDED" }`

---

## 3. Products & Uploads (`/products`, `/vendor/products`, `/uploads`)
- `GET /products` (Public)
  - Query: `?q=...&category=...&minPrice=...&maxPrice=...&vendorId=...&minRating=...&inStock=true&sort=price_asc|price_desc|newest|rating|relevance&page=1&limit=20`
  - Full-text search with typo tolerance (via Elasticsearch or Postgres fallback), faceted categories.
- `GET /products/:id` (Public)
  - Returns detailed product information, vendor store, category, images, reviews summary.
- `POST /vendor/products` (Approved Vendor required)
  - Body: `{ title, description, price, stock, sku, categoryId, status, images: [url1, url2...] }`
  - Syncs to Elasticsearch.
- `PATCH /vendor/products/:id` (Approved Vendor, ownership enforced)
  - Partial updates, syncs updates to Elasticsearch.
- `DELETE /vendor/products/:id` (Approved Vendor, ownership enforced)
  - Sets `deletedAt`, removes or hides in search index.
- `GET /vendor/products` (Approved Vendor)
  - Query: `?page=1&limit=20&search=...&stockStatus=low|out`
- `POST /uploads/presign` (Approved Vendor)
  - Body: `{ fileName, fileType, fileSize }` (validates jpg/png/webp, max 5MB)
  - Returns: `{ uploadUrl, fileUrl }`

---

## 4. Categories (`/categories` & `/admin/categories`)
- `GET /categories` (Public)
  - Returns hierarchical category tree (parent/subcategories).
- `POST /admin/categories` (Admin required)
  - Body: `{ name, slug?, parentId? }`
- `PATCH /admin/categories/:id` (Admin required)
  - Updates category name, slug, parent.

---

## 5. Cart (`/cart`)
- `GET /cart` (Customer or Guest via `x-guest-session-id`)
  - Validates active stock and price changes at read time.
  - Returns `{ items: [{ productId, title, price, quantity, stock, imageUrl, isAvailable }], subtotal, discount, total, appliedCoupon }`.
- `POST /cart/items`
  - Body: `{ productId, quantity }`
- `PATCH /cart/items/:productId`
  - Body: `{ quantity }` (0 removes)
- `DELETE /cart/items/:productId`
  - Removes item from cart.
- `POST /cart/coupon`
  - Body: `{ code }`
  - Validates discount, limits, expiry.
- `DELETE /cart/coupon`
  - Removes applied coupon.

---

## 6. Orders & Checkout (`/checkout`, `/orders`, `/vendor/orders`)
- `POST /checkout` (Customer required)
  - Body: `{ addressId, couponCode? }`
  - Row-lock stock decrement, splits cart into parent Order + vendor SubOrders.
  - Returns: `{ orderId, total, subOrders: [...], clientSecret? }`
- `GET /orders` (Customer)
  - Order history with sub-order statuses.
- `GET /orders/:id` (Customer / Admin)
  - Detailed parent order, shipping address, vendor sub-orders, timeline.
- `POST /orders/:id/cancel` (Customer)
  - Permitted only while status is `PLACED`. Restores stock, triggers refund flow.
- `GET /orders/:id/invoice` (Customer / Admin)
  - Streams dynamically generated PDF invoice.
- `GET /vendor/orders` (Approved Vendor)
  - Returns sub-orders belonging exclusively to this vendor.
- `PATCH /vendor/suborders/:id/status` (Vendor, ownership enforced)
  - Body: `{ status: "PACKED" | "SHIPPED" | "DELIVERED" }`
  - Validates strict step-forward state progression (`PLACED` -> `PACKED` -> `SHIPPED` -> `DELIVERED`).

---

## 7. Payments & Webhooks (`/payments`)
- `POST /payments/create-intent` (Customer)
  - Body: `{ orderId }`
  - Creates Stripe PaymentIntent with sub-order transfer metadata.
- `POST /payments/webhook` (External Stripe webhook)
  - Idempotent signature-verified handler.
  - Marks Order `PAID`, triggers 10% platform commission calculation, creates `PayoutLedger` records.
- `GET /vendor/earnings` (Vendor)
  - Returns total gross earnings, platform commission deducted, net payout, and ledger records.

---

## 8. Reviews (`/products/:id/reviews`, `/admin/reviews`)
- `GET /products/:id/reviews` (Public)
  - List approved customer reviews with ratings and comments.
- `POST /products/:id/reviews` (Customer who bought item and has `DELIVERED` status)
  - Body: `{ rating: 1..5, comment? }`
  - Recalculates product `avgRating` and `reviewCount`.
- `DELETE /admin/reviews/:id` (Admin)
  - Moderation deletion of abusive reviews.

---

## 9. Coupons (`/admin/coupons`)
- `GET /admin/coupons` (Admin)
- `POST /admin/coupons` (Admin)
  - Body: `{ code, type: "PERCENT" | "FLAT", value, minOrder, maxDiscount, usageLimit, perUserLimit, expiresAt, active }`
- `PATCH /admin/coupons/:id` (Admin)
- `DELETE /admin/coupons/:id` (Admin)

---

## 10. Admin Analytics (`/admin/analytics`)
- `GET /admin/analytics/summary` (Admin)
  - KPIs: Total GMV, Platform Commission, Orders Count, Active Vendors, Total Customers.
- `GET /admin/analytics/revenue?from=...&to=...` (Admin)
  - Time-series aggregation of revenue & commission.
- `GET /admin/analytics/top-vendors` (Admin)
- `GET /admin/analytics/top-products` (Admin)
- `GET /admin/analytics/export-csv` (Admin)
