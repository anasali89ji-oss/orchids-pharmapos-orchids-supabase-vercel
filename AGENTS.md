## Project Summary
PharmaPOS is a comprehensive, full-stack Pharmacy Point of Sale (POS) system built with Next.js 14+, Supabase, and Tailwind CSS. It provides complete pharmacy management capabilities including sales processing, inventory tracking, customer/supplier management, financial accounting, and comprehensive reporting.

## Tech Stack
- **Framework**: Next.js 15 with App Router and TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: React Icons
- **Notifications**: Sonner

## Architecture
```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard with stats and charts
│   ├── pos/               # Point of Sale - process sales
│   ├── held-sales/        # Suspended transactions
│   ├── products/          # Product CRUD management
│   ├── inventory/         # Stock management with batch tracking
│   ├── suppliers/         # Supplier management
│   ├── purchases/         # Multiple purchase types (manual, supplier_order, consignment, transfer_in, return_purchase, adjustment, supplier_return)
│   ├── returns/           # Product returns/refunds
│   ├── accounting/        # Ledger, credits, income/expense
│   ├── reports/           # Sales, inventory, profit reports
│   ├── receipts/          # Sales receipt history
│   ├── customers/         # Customer CRM
│   ├── settings/          # System configuration + Billing (8 tabs)
│   ├── users/             # User management (10+ roles, 50 limit)
│   ├── notifications/     # System notifications center
│   ├── superadmin-login/  # Super admin authentication
│   ├── superadmin/        # Super admin portal (dashboard + pharmacies)
│   ├── suspended/         # Suspended account page
│   └── profile/           # User profile management
├── components/
│   ├── layout/            # Sidebar, Header, DashboardLayout
│   ├── SubscriptionGuard/ # Subscription status guard
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── supabase/          # Supabase client (client, server, admin)
│   ├── auth-context.tsx   # Auth context (4hr activity checks)
│   ├── pharmacy-context.tsx # Pharmacy context (subscription status)
│   └── superadmin-context.tsx # Super admin context
└── types/                 # TypeScript interfaces
```

## Database Schema
Multi-tenant architecture with pharmacy_id foreign key on all tables:
- **pharmacies**: Pharmacy accounts with subscription management (plan, status, stripe_customer_id, is_suspended)
- **users**: 10+ user roles (pharmacy_admin, manager, pharmacist, cashier, inventory_clerk, accountant, reporting_analyst, sales_representative, support_agent) with 50-user limit
- **products**: Medicines with stock, pricing, batch tracking, expiry
- **inventory_batches**: FIFO batch tracking ( expiry, quantity, cost_price)
- **sales**: Transactions with items, totals, payment method
- **held_sales**: Suspended/held transactions
- **purchases**: 7 purchase types (manual, supplier_order, consignment, transfer_in, return_purchase, adjustment, supplier_return) with status workflow
- **returns**: Product returns and refunds
- **ledger**: Financial transactions (credits, debits, balance)
- **credits**: Pay-later/credit sales tracking
- **customers**: Customer profiles with loyalty
- **suppliers**: Supplier information
- **categories**: Product categorization
- **settings**: Store configuration
- **audit_logs**: System audit trail
- **notifications**: System alerts (low_stock, expiry, credits) with severity levels
- **stripe_payments**: Stripe subscription payments tracking
- **super_admins**: Super admin accounts for pharmacy management
- **system_error_logs**: Cross-pharmacy error logging
- **backup_schedules**: Automated backup configuration per pharmacy

**Row Level Security (RLS)**: All tables have RLS policies with pharmacy_id-based isolation using get_user_pharmacy_id() and is_super_admin() functions.

## User Preferences
- Currency: PKR (Pakistani Rupee)
- Tax Rate: 5%
- Theme: Light (with dark mode toggle)
- Language: English (Urdu support planned)

## Project Guidelines
- No emojis in UI/content
- Use Tailwind CSS classes for styling
- All financial values in PKR
- Authentication via Supabase Auth
- Multi-tenant: All data queries scoped by pharmacy_id via RLS
- Real-time updates via Supabase Realtime (where applicable)
- Stripe for subscription payments (test keys configured)
- 4-hour activity checks, 10-minute proactive refresh
- RLS policies enforce pharmacy isolation

## Common Patterns
- Form validation with native HTML5 + custom toast messages
- Loading states with shimmer animations
- Modal dialogs using shadcn/ui Dialog component
- Data fetching with Supabase client-side
- Export functionality to CSV and PDF format (jsPDF + autoTable)
- Responsive design using Tailwind breakpoints
- Error boundaries for graceful error handling
- Real-time data with auto-refresh hooks
- Decimal.js for precise financial calculations

## Super Admin Credentials
- **Login URL**: `/superadmin-login`
- **Email**: `admin@pharmapos.com`
- **Password**: `admin123`
- **Default Super Admin**: Name: "Super Admin"

## Recent Enhancements
- Multi-tenant SaaS architecture with pharmacy isolation
- Super Admin portal (/superadmin-login, /superadmin) for pharmacy management
- Stripe integration for subscription payments (checkout, webhooks)
- 12 user roles: pharmacy_admin, manager, pharmacist, cashier, inventory_clerk, accountant, reporting_analyst, sales_representative, support_agent, procurement_officer, warehouse_supervisor, delivery_coordinator
- 50-user limit enforcement with upgrade prompts
- Vercel deployment config (vercel.json) with security headers and cron jobs
- Settings page with 8 tabs: General, Financial, Inventory, Receipts, Notifications, Backup, Security, Billing
- Billing tab with subscription plans (Starter 5K, Professional 30K, Enterprise 70K PKR)
- Session inactivity fix: 4-hour inactive users stay logged in, 10-min proactive refresh
- FIFO batch tracking with inventory_batches table
- 7 purchase types: manual, supplier_order, consignment, transfer_in, return_purchase, adjustment, supplier_return
- Subscription status checks and redirects (/suspended)
- middleware.ts enforces pharmacy isolation and subscription validation
- Error boundary wrapping components
- Real-time data hooks with 30-60 second auto-refresh
- Enhanced CSS with hover effects, transitions, animations
- Full data backup/export functionality
- Reports page with PDF/CSV export
- Notifications Center with system alerts (low stock, expiry, credits)
- Optimized POS with useTransition, useMemo for 70Hz-like responsiveness
- Held Sales restore automatically populates cart when redirecting to POS
