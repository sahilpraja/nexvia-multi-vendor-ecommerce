# Nexvia Multi-Vendor E-Commerce Marketplace (Project ID: FS-01)

An Amazon-style multi-vendor e-commerce marketplace where independent merchants register stores, list products, and customers browse and purchase. The platform splits payments between vendors and platform, automatically retaining a **10% platform commission**.

---

## 1. Tech Stack Overview

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express (TypeScript), Zod validation, JWT + HTTP-only Refresh Token Rotation
- **Database**: PostgreSQL via Prisma ORM
- **Search Engine**: Elasticsearch with fuzzy matching, facets, and PostgreSQL search fallback
- **Cache & Sessions**: Redis (7-day TTL cart persistence, stock/price validation at read time)
- **Object Storage**: AWS S3 / MinIO (Product images with pre-signed upload URLs)
- **Payments & Commission**: Stripe Connect / Razorpay Route split payment simulation & webhook idempotency
- **Packaging**: Docker & Docker Compose

---

## 2. Quick Start (< 15 Minutes)

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### Step 1: Start Containerized Services
```bash
docker-compose up -d
```
This boots:
- **PostgreSQL** (`localhost:5432`)
- **Redis** (`localhost:6379`)
- **Elasticsearch** (`localhost:9200`)
- **MinIO S3** (`localhost:9000` / Console `localhost:9001`)

### Step 2: Install Dependencies & Run Database Migrations
```bash
# In the project root:
npm install

# Setup server environment & generate Prisma Client
cp server/.env.example server/.env
npm run prisma:generate
npm run prisma:migrate
```

### Step 3: Seed Realistic Marketplace Data
```bash
npm run prisma:seed
```
This creates or updates a small, repeatable demo catalog:
- 1 admin, 1 customer (with a shipping address), and 1 approved vendor named Wonder
- 8 active products across audio, computers, home, and fitness categories
- Product images and ratings for storefront presentation

The demo seed is idempotent: rerunning it updates only the demo accounts, categories, and products identified by the `DEMO-WONDER-*` SKUs. It does not clear existing users, orders, products, or other marketplace data. Run it with `DATABASE_URL` set to the database you intend to populate. The seeded credentials below are for demonstrations only; change them before exposing demo accounts publicly.

### Step 4: Launch Dev Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/api/v1/health`

---

## 3. Demo Credentials

| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@example.com` | `Password123!` | Public Marketplace, Cart, Checkout, My Orders |
| **Vendor (Wonder)** | `wonder@vendors.com` | `Password123!` | Vendor Dashboard, Product Catalog, Sub-Orders, Earnings |
| **Admin** | `admin@nexvia.com` | `Password123!` | Admin Analytics, Vendor Approvals, Coupons |

---

## 4. Key Functional Features (All P0 Requirements)

### 1. Authentication & RBAC (Milestone 2)
- Short-lived JWT access token (15 min) + secure HTTP-only refresh token (7 days) with token rotation.
- Role-based middleware (`CUSTOMER`, `VENDOR`, `ADMIN`) enforced on all protected endpoints.
- Rate limiting on auth endpoints and Zod request validation.

### 2. Vendor Onboarding & Product Management (Milestone 3)
- Merchant application workflow (`PENDING`, `APPROVED`, `SUSPENDED`).
- Vendor-scoped product management with soft-deletes (`deletedAt`).
- Strict ownership checks: Vendor A cannot modify Vendor B's products.
- S3 pre-signed upload URLs with file format (`jpg`, `png`, `webp`) and size (max 5 MB) validation.
- Low-stock badge indicator (≤10 items).

### 3. Product Search & Discovery (Milestone 4)
- Elasticsearch sync on create/update/delete.
- Fuzzy typo-tolerant full-text search across titles, descriptions, and categories.
- Filters: category, price range, vendor, minimum rating, in-stock only.
- Sorting: relevance, newest, price low-to-high, price high-to-low, rating.
- Built-in PostgreSQL search fallback if Elasticsearch is offline.

### 4. Cart, Atomic Checkout & Sub-Order Splitting (Milestone 5)
- Redis cart with 7-day TTL refreshed on activity.
- Live price and stock verification at read time.
- Atomic checkout transaction splitting parent order into individual **Vendor Sub-Orders**.
- DB row-level locks prevent overselling under concurrent checkout attempts.
- Order State Machine: `PLACED` ➔ `PACKED` ➔ `SHIPPED` ➔ `DELIVERED`. Vendors can only advance their own sub-orders in sequence.

### 5. Split Payments & Commission (Milestone 6)
- Configurable 10% platform commission retained automatically.
- Stripe Connect / Razorpay Route test mode with idempotent webhook handling.
- Payment ledger records gross amount, platform fee, and net vendor payout.
- Vendor earnings breakdown page.

### 6. Verified Reviews, Coupons & Invoices (Milestone 7)
- **Verified Buyer Policy**: Only customers who received a `DELIVERED` order of the product can submit a review.
- Dynamic PDF invoice generation (PDFKit) downloadable by order owners and admins.
- Admin analytics dashboard with GMV, commissions, orders by status, and interactive Recharts graphs.

---

## 5. Automated Tests

Run unit and integration test suite:
```bash
npm run test
```
Tests cover:
- 10% platform commission and split payouts arithmetic
- Percentage and flat coupon calculation and minimum spend rules
- Sub-order state machine transition validation
