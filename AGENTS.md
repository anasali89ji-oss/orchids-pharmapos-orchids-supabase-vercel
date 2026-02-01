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
│   ├── inventory/         # Stock management with import/export
│   ├── suppliers/         # Supplier management
│   ├── purchases/         # Manual and supplier purchases
│   ├── returns/           # Product returns/refunds
│   ├── accounting/        # Ledger, credits, income/expense
│   ├── reports/           # Sales, inventory, profit reports
│   ├── receipts/          # Sales receipt history
│   ├── customers/         # Customer CRM
│   ├── settings/          # System configuration
│   └── profile/           # User profile management
├── components/
│   ├── layout/            # Sidebar, Header, DashboardLayout
│   └── ui/                # shadcn/ui components
├── lib/
│   └── supabase/          # Supabase client (client, server, admin)
└── types/                 # TypeScript interfaces
```

## Database Schema
- **products**: Medicines with stock, pricing, batch, expiry
- **sales**: Transactions with items, totals, payment method
- **held_sales**: Suspended/held transactions
- **purchases**: Stock purchases from suppliers
- **returns**: Product returns and refunds
- **ledger**: Financial transactions (credits, debits, balance)
- **credits**: Pay-later/credit sales tracking
- **customers**: Customer profiles with loyalty
- **suppliers**: Supplier information
- **categories**: Product categorization
- **settings**: Store configuration
- **audit_logs**: System audit trail

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
- Real-time updates via Supabase Realtime (where applicable)

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

## Recent Enhancements
- PDF report generation for Sales, Purchases, Inventory, Returns, Ledger
- Error boundaries wrapping all major pages
- Real-time data hooks with 30-60 second auto-refresh
- Enhanced CSS with hover effects, transitions, animations
- Settings page with 7 tabs: General, Financial, Inventory, Receipts, Notifications, Backup, Security
- Full data backup/export functionality
- Reports page with 7 report types and PDF/CSV export
- Notifications Center page with system alerts (low stock, expiry, credits)
- Optimized POS with useTransition, useMemo, product caching for 70Hz-like responsiveness
- Held Sales restore automatically populates cart when redirecting to POS
- Notifications table in database for persistent alerts with severity tracking
