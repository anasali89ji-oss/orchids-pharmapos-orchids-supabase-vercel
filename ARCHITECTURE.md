# PharmaPOS System Architecture

Complete architectural overview of the PharmaPOS pharmacy management system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Database Schema](#database-schema)
5. [Directory Structure](#directory-structure)
6. [API Routes](#api-routes)
7. [Authentication Flow](#authentication-flow)
8. [Data Flow](#data-flow)
9. [Security Model](#security-model)
10. [Performance Optimization](#performance-optimization)
11. [Deployment Architecture](#deployment-architecture)

## System Overview

PharmaPOS is a multi-tenant SaaS Pharmacy POS system built on Next.js 15 with full-stack capabilities.

### Key Features
- Multi-tenant architecture with pharmacy isolation
- Role-based access control (13 user roles)
- Real-time inventory tracking with FIFO batch management
- Integrated payment processing (Stripe)
- Automated backups and system maintenance
- Comprehensive reporting and analytics

### Design Principles
- **Security First**: RLS policies, server-only modules, rate limiting
- **Performance Optimized**: Code splitting, caching, lazy loading
- **Scalable Architecture**: Multi-tenant, API-first design
- **Developer Experience**: TypeScript, structured logging, comprehensive docs

## Technology Stack

### Frontend
- **Framework**: Next.js 15.3.5 (App Router, React 19)
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **State Management**: React Context (Auth, Pharmacy, SuperAdmin)
- **Animations**: Framer Motion 12
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React + React Icons
- **PDF Generation**: jsPDF + autoTable

### Backend
- **Runtime**: Node.js 20.x
- **API**: Next.js API Routes (Node.js and Edge runtimes)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage

### Infrastructure
- **Platform**: Vercel
- **CI/CD**: Git-based automated deployments
- **Monitoring**: Vercel Analytics + structured logging
- **Cron Jobs**: Vercel Cron (3 jobs)

### Third-Party Integrations
- **Payment**: Stripe (test mode)
- **Error Tracking**: Sentry (optional)
- **Email**: Supabase Auth emails

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
└─────────────────────────────────────────────────────────────────┘
  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐
  │ Browser │  │ Mobile  │  │  Tablet │  │  Super Admin Portal │
  └────┬────┘  └────┬────┘  └────┬────┘  └──────────┬──────────┘
       │            │            │                     │
       └────────────┴────────────┴─────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    NEXT.JS APPLICATION LAYER                     │
│                      (Vercel Edge Network)                       │
└─────────────────────────────────────────────────────────────────┘
  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐
  │  Static Assets   │  │  Server Pages &  │  │  API Routes     │
  │  (CDN Cached)    │  │  App Router      │  │  (Node.js 20.x) │
  └──────────────────┘  └────────┬─────────┘  └────────┬────────┘
                                │                    │
  ┌─────────────────────────────┼────────────────────┼───────────┐
  │  ┌──────────┐  ┌──────────┐ │ ┌──────┐  ┌─────┐ │ ┌───────┐  │
  │  │   Auth   │  │ Pharmacy │ │ │Stripe│  │Cron │ │ │Backup │  │
  │  │ Context  │  │ Context  │ │ │API   │  │Jobs │ │ │System │  │
  │  └──────────┘  └──────────┘ │ └──────┘  └─────┘ │ └───────┘  │
  └─────────────────────────────┼────────────────────┼───────────┘
                                │                    │
┌───────────────────────────────▼────────────────────▼─────────────┐
│                    MIDDLEWARE & SERVICES LAYER                    │
└─────────────────────────────────────────────────────────────────┘
  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
  │ Rate Limiting│  │  Structured  │  │ Supabase Error Handling│  │
  │              │  │    Logging   │  │                        │  │
  └──────────────┘  └──────────────┘  └────────────────────────┘  │
  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
  │    Auth      │  │   Session    │  │   Stripe Integration  │  │
  │  Middleware  │  │   Manager    │  │                        │  │
  └──────────────┘  └──────────────┘  └────────────────────────┘  │
  ┌──────────────────────────────────────────────────────────────┐  │
  │              Server-Only Modules (Security)                  │  │
  │  - /src/lib/config/server-env.ts                            │  │
  │  - /src/lib/stripe/server.ts                                │  │
  │  - /src/lib/supabase/errors.ts                              │  │
  └──────────────────────────────────────────────────────────────┘  │
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                    DATA LAYER                                    │
│              (Supabase PostgreSQL + RLS)                         │
└─────────────────────────────────────────────────────────────────┘
  ┌────────────────────┐  ┌──────────────────┐  ┌────────┬─────────┐
  │   Multi-Tenant     │  │   Row Level      │  │ Real-  │Storage │
  │   Data Isolation   │  │   Security       │  │  time  │         │
  │   (pharmacy_id)    │  │   (RLS Policies) │  │        │         │
  └────────────────────┘  └──────────────────┘  └────────┴─────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
└─────────────────────────────────────────────────────────────────┘
  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────────────┐
  │ Stripe  │  │  Email  │  │  Vercel │  │   Analytics (Sentry)  │
  │ Payment │  │ Service │  │  Cron   │  │                       │
  └─────────┘  └─────────┘  └─────────┘  └───────────────────────┘
```

## Database Schema

### Core Tables

#### `pharmacies`
- Multi-tenant root table
- All child tables reference `pharmacy_id`
- Subscription management (tier, status, billing)

```sql
pharmacies
├── id (uuid, primary)
├── name (text)
├── slug (text, unique)
├── subscription_tier (enum: basic, pro, enterprise)
├── subscription_status (enum: active, cancelled, inactive)
├── is_suspended (boolean)
└── stripe_customer_id (text, null)
```

#### `users`
- 13 user roles
- 50-user limit per tier
- Supabase Auth integration

```sql
users
├── id (uuid, refers to auth.users)
├── pharmacy_id (uuid, foreign key)
├── email (text, unique per pharmacy)
├── role (enum: 13 roles)
├── is_active (boolean)
└── auth_user_id (uuid, foreign key)
```

#### `products`
- Medication management
- Inventory tracking
- Batch-aware pricing

```sql
products
├── id (uuid, primary)
├── pharmacy_id (uuid, foreign key)
├── name, sku, barcode
├── category_id (uuid)
├── cost_price, selling_price
├── current_stock (integer)
└── is_active (boolean)
```

#### `inventory_batches`
- FIFO batch tracking
- Expiry management
- Cost basis accounting

```sql
inventory_batches
├── id (uuid, primary)
├── product_id (uuid)
├── batch_number (text)
├── expiry_date (date)
├── quantity (integer)
└── cost_price (decimal)
```

#### `sales`
- Transaction records
- Multi-payment support
- Receipt generation

```sql
sales
├── id (uuid, primary)
├── pharmacy_id (uuid)
├── total_amount (decimal)
├── payment_method (enum)
├── cashier_id (uuid)
├── customer_id (uuid, null)
└── sale_date (timestamp)
```

#### `purchases`
- 7 purchase types
- Status workflow
- Invoice management

```sql
purchases
├── id (uuid, primary)
├── pharmacy_id (uuid)
├── purchase_type (enum: 7 types)
├── supplier_id (uuid)
├── total_cost (decimal)
├── status (enum)
└── purchase_date (timestamp)
```

### Supporting Tables

#### `notifications`
- System alerts
- Multi-severity (info, warning, error)
- Real-time delivery

#### `ledger`
- Double-entry accounting
- Credits/debits
- Balance tracking

#### `credits`
- Pay-later tracking
- Customer credit limits
- Payment scheduling

#### `audit_logs`
- System audit trail
- Action logging
- Compliance tracking

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public pages
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── suspended/
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/            # Main dashboard
│   │   ├── pos/                  # Point of Sale
│   │   ├── products/             # Product management
│   │   ├── inventory/            # Stock management
│   │   ├── purchases/            # Purchase transactions
│   │   ├── sales/                # Sales history
│   │   ├── returns/              # Returns management
│   │   ├── customers/            # Customer CRM
│   │   ├── suppliers/            # Supplier management
│   │   ├── accounting/           # Financial management
│   │   ├── reports/              # Analytics & reports
│   │   ├── receipts/             # Receipt management
│   │   ├── users/                # User management
│   │   ├── notifications/        # Notification center
│   │   ├── settings/             # System settings (8 tabs)
│   │   └── profile/              # User profile
│   ├── (superadmin)/             # Super admin routes
│   │   ├── superadmin-login/
│   │   └── superadmin/
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── stripe/               # Payment endpoints
│   │   ├── cron/                 # Scheduled jobs
│   │   ├── backup/               # Backup operations
│   │   ├── notifications/        # Notification delivery
│   │   ├── superadmin/           # Admin operations
│   │   └── admin/                # Admin operations
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── middleware.ts             # Route protection
│
├── components/
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── DashboardLayout.tsx
│   ├── SubscriptionGuard/        # Subscription verification
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Client-side Supabase
│   │   ├── server.ts             # Server-side Supabase
│   │   └── admin.ts              # Admin client
│   ├── config/
│   │   └── server-env.ts         # Server-only env vars
│   ├── stripe/
│   │   └── server.ts             # Stripe server integration
│   ├── auth-context.tsx          # Auth state management
│   ├── pharmacy-context.tsx      # Pharmacy state
│   ├── superadmin-context.tsx    # Super admin state
│   ├── logger.ts                 # Structured logging
│   ├── rate-limit.ts             # Rate limiting
│   ├── sync-service.ts           # Data synchronization
│   ├── offline-db.ts             # Offline storage (IndexedDB)
│   └── receipts/                 # Receipt templates
│       ├── sale-receipt.ts
│       ├── purchase-receipt.ts
│       └── return-receipt.ts
│
├── types/                        # TypeScript interfaces
│   ├── index.ts
│   ├── database.ts
│   └── api.ts
│
└── visual-edits/                 # Orchids visual editor
```

## API Routes

### Authentication Routes
- `POST /api/auth/reset-password/request`
- `POST /api/auth/reset-password/update`

### Stripe Routes
- `POST /api/stripe/checkout`
- `POST /api/stripe/cancel`

### Cron Jobs
- `GET /api/cron/connection-ping` - Keep-alive ping (15 min)
- `GET /api/cron/session-cleanup` - Token cleanup (3 AM)

### Backup Routes
- `GET /api/backup/daily` - Daily backup (2 AM)

### Admin Routes
- `POST /api/admin/change-password`

### Super Admin Routes
- `POST /api/superadmin/create-pharmacy`
- `POST /api/superadmin/invite-user`

### Notification Routes
- `POST /api/notifications/send`

## Authentication Flow

```
User Request
    │
    ├─> middleware.ts
    │   ├─> Check session
    │   ├─> Validate pharmacy_id
    │   ├─> Check subscription status
    │   └─> Set headers
    │
    ├─> Auth Context
    │   ├─> Session management
    │   ├─> 4-hour activity timeout
    │   └─> 10-min proactive refresh
    │
    └─> Component
        ├─> Check permissions
        └─> Render based on role
```

### Role-Based Access Control

13 User Roles:
1. `super_admin` - Full system access
2. `pharmacy_admin` - Full pharmacy access
3. `manager` - Operations management
4. `pharmacist` - Clinical operations
5. `cashier` - Point of sale
6. `inventory_clerk` - Stock management
7. `accountant` - Financial management
8. `reporting_analyst` - Analytics access
9. `sales_representative` - Sales operations
10. `support_agent` - Customer support
11. `procurement_officer` - Purchasing
12. `warehouse_supervisor` - Inventory supervision
13. `delivery_coordinator` - Delivery management

## Data Flow

### Create Sale Flow
```
POS Page
    ├─> Scan product barcode/search
    ├─> Fetch product from Supabase
    ├─> Add to cart (client state)
    ├─> Select payment method
    ├─> Submit to /api/sales/create
    ├─> Validate & create sale record
    ├─> Update inventory (decrement stock)
    ├─> Update ledger (debit/credit)
    ├─> Generate receipt
    └─> Print thermal receipt
```

### Inventory Sync Flow
```
1. Online Mode
    ├─> Real-time Supabase queries
    ├─> 60-sec auto-refresh
    └─> WebSocket updates (optional)

2. Offline Mode
    ├─> IndexedDB storage
    ├─> IndexedDB transactions
    └─> Sync on reconnection

3. Sync Service
    ├─> Compare local vs remote
    ├─> Merge data (conflict resolution)
    └─> Update offline cache
```

## Security Model

### Multi-Tenant Isolation
```sql
-- All queries scoped by pharmacy_id via RLS
CREATE POLICY "pharmacy_isolation" ON products
  USING (pharmacy_id = get_user_pharmacy_id());
```

### Server-Only Enforcement
- `import 'server-only'` in all API routes
- Environment variables in `/src/lib/config/server-env.ts`
- Stripe secrets never exposed to client

### Rate Limiting
```typescript
// Per-route rate limits
Auth routes:     5 requests / 15 minutes
Payment routes: 10 requests / 1 hour
CRUD routes:     100 requests / 1 minute
Read routes:     300 requests / 1 minute
```

### Authentication Security
- Supabase Auth (JWT-based)
- 4-hour session timeout
- Password reset tokens (1-hour expiry)
- Secure HTTP-only cookies

### Data Protection
- RLS on all tables
- SQL injection prevention (Supabase SDK)
- XSS protection (React auto-escaping)
- CSRF protection (SameSite cookies)

## Performance Optimization

### Bundle Optimization
```typescript
// next.config.ts
experimental: {
  optimizePackageImports: [
    '@radix-ui/react-dialog',
    'framer-motion',
    'recharts',
    'lucide-react',
  ]
}

modularizeImports: {
  'lucide-react': {
    transform: 'lucide-react/dist/esm/icons/{{member}}',
  },
}
```

### Code Splitting
- Dynamic imports for heavy charts
- Route-based splitting (automatic in Next.js)
- Component lazy loading

### Caching Strategy
```vercel.json
// Static Assets: 1 year, immutable
// Images: 30 days
// API: no-cache
```

### Database Optimization
- Connection pooling (Supabase)
- Index usage on foreign keys
- Query optimization with select filters
- Keep-alive cron (every 15 min)

## Deployment Architecture

### Vercel Configuration

```vercel.json
{
  "framework": "nextjs",
  "runtime": "nodejs20.x",
  "regions": ["iad1"],
  "functions": {
    "app/**": { "memory": 1024, "maxDuration": 30 },
    "api/**": { "memory": 2048, "maxDuration": 60 },
    "api/backup/daily": { "memory": 3072, "maxDuration": 180 }
  }
}
```

### CI/CD Pipeline
```
Git Push
    ├─> Vercel detects commit
    ├─> Build application
    ├─> Run tests (if configured)
    ├─> Deploy to Preview (PR)
    ├─> Deploy to Production (main)
    └─> Health checks
```

### Monitoring
- **Vercel Analytics**: Core Web Vitals, page views
- **Vercel Logs**: Build errors, runtime errors
- **Sentry** (optional): Error tracking
- **Structured Logging**: Application-level logs

### Backup Strategy
- **Automatic Daily**: 2:00 AM UTC cron job
- **Database Backups**: Supabase daily backups
- **Point-in-Time Recovery**: Available in Supabase

## System Capabilities

### Scalability
- Multi-tenant design (unlimited pharmacies)
- Horizontal scaling (Vercel Edge Network)
- Database connection pooling
- CDN-cached static assets

### Reliability
- Automated backups
- Error handling & recovery
- Graceful degradation
- Connection keep-alive

### Maintainability
- TypeScript strict mode
- Structured logging
- Comprehensive error handling
- Modular architecture

### Security
- Multi-tenant isolation
- Row-level security
- Server-only sensitive data
- Rate limiting & authentication

---

**Architecture Version**: 1.0.0  
**Last Updated**: December 2026  
**Maintained By**: PharmaPOS Development Team
