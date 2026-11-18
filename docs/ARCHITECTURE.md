# System Architecture - Multi-Vendor E-Commerce Marketplace (FS-01)

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients (React + TS + Tailwind)"]
        CustomerUI["Customer App\n(Catalog, Cart, Checkout, Orders)"]
        VendorUI["Vendor Dashboard\n(Products, Orders, Earnings)"]
        AdminUI["Admin Dashboard\n(Approvals, Categories, Coupons, Analytics)"]
    end

    subgraph Gateway["API Gateway / Routing Layer"]
        ExpressApp["Express.js Server (/api/v1)\n(Zod Validation, Auth & RBAC Middleware, Rate Limiter)"]
    end

    subgraph Services["Core Application Services"]
        AuthService["Auth & Token Service\n(JWT, Refresh Token Rotation)"]
        ProductService["Product & Vendor Service\n(Soft-delete, S3 pre-signed URLs)"]
        SearchService["Search Service\n(Elasticsearch with Postgres sync)"]
        CartService["Cart Service\n(Redis 7-day TTL, live price/stock validation)"]
        OrderService["Order & Split Engine\n(Parent Order -> Vendor Sub-orders, Row-level Locks)"]
        PaymentService["Payment & Payout Ledger\n(Stripe Connect, 10% Platform Fee, Webhooks)"]
        AnalyticsService["Admin Analytics & Invoice\n(PDFKit Invoices, KPI Aggregation)"]
    end

    subgraph DataTier["Data & Cache Tier"]
        Postgres[("PostgreSQL DB\n(Prisma ORM: Relational Data & Ledger)")]
        RedisStore[("Redis\n(Carts, Sessions, Hot-read Cache)")]
        Elasticsearch[("Elasticsearch\n(Fuzzy Search, Facets, Filters)")]
        MinIO[("MinIO / AWS S3\n(Product Media Storage)")]
    end

    Clients -->|HTTPS / REST API| ExpressApp
    ExpressApp --> AuthService
    ExpressApp --> ProductService
    ExpressApp --> SearchService
    ExpressApp --> CartService
    ExpressApp --> OrderService
    ExpressApp --> PaymentService
    ExpressApp --> AnalyticsService

    AuthService --> Postgres
    AuthService --> RedisStore
    ProductService --> Postgres
    ProductService --> MinIO
    ProductService --> Elasticsearch
    SearchService --> Elasticsearch
    CartService --> RedisStore
    CartService --> Postgres
    OrderService --> Postgres
    PaymentService --> Postgres
    AnalyticsService --> Postgres
```

---

## 2. Order Lifecycle & Sub-order State Machine

```mermaid
stateDiagram-v2
    [*] --> PLACED: Customer Checkout (Stock Locked & Decremented)
    PLACED --> PACKED: Vendor packs their sub-order items
    PACKED --> SHIPPED: Vendor ships parcel
    SHIPPED --> DELIVERED: Carrier delivery confirmed
    DELIVERED --> [*]: Eligible for Verified Review

    PLACED --> CANCELLED: Customer cancels order (Stock Restored, Refund Triggered)
    PLACED --> PAYMENT_FAILED: Payment webhook failure
```

---

## 3. Split Payment & Commission Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant API as Backend API
    participant DB as PostgreSQL
    participant Stripe as Stripe Connect / Webhook
    actor Vendor
    actor Admin

    Customer->>API: POST /api/v1/checkout (Shipping Address, Cart Items)
    API->>DB: Atomic Transaction (Verify stock, lock rows, decrement inventory)
    API->>DB: Create Parent Order & Vendor Sub-Orders
    API->>Stripe: Create Payment Intent / Session (Transfer Group)
    API-->>Customer: Return Client Secret
    Customer->>Stripe: Confirm Payment
    Stripe-->>API: POST /api/v1/payments/webhook (payment_intent.succeeded)
    API->>API: Verify Webhook Signature & Idempotency Key
    API->>DB: Update Order paymentStatus = PAID
    loop Each Sub-Order
        API->>API: Deduct Platform Commission (10%)
        API->>Stripe: Transfer Net (90%) to Vendor Payout Account
        API->>DB: Insert into PayoutLedger (gross, commission, net, status=TRANSFERRED)
    end
    API-->>Customer: Sub-order status set to PLACED, Invoice generated
```
