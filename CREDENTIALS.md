# PharmaPOS - Complete Credentials & Access Guide

## System Overview
PharmaPOS is a comprehensive Pharmacy Point of Sale (POS) system with multi-tenant architecture. Each pharmacy operates independently with complete data isolation.

---

## Super Admin Access

### Login Credentials
- **Email**: `superadmin@pharmapos.com`
- **Password**: `admin123`
- **Login URL**: `/superadmin-login` or `http://localhost:3000/superadmin-login`

### Super Admin Dashboard
- **Dashboard URL**: `/superadmin` or `http://localhost:3000/superadmin`

### Super Admin Features
- Create and manage pharmacy accounts
- View all pharmacies with revenue data
- Manage pharmacy subscriptions (Pro - PKR 14,999/mo, Enterprise - PKR 24,999/mo)
- Stripe integration for subscription payments
- Suspend/unsuspend pharmacies
- View pharmacy owner email, sales data, and financial reports

---

## Demo Pharmacy Access

### Pharmacy Details
- **Name**: Demo Pharmacy
- **Slug**: `demo-pharmacy`
- **Owner**: John Doe
- **Owner Email**: `john.doe@demo.com`
- **Subscription Tier**: Pro (PKR 14,999/mo)
- **Max Staff Users**: 50
- **Status**: Active

### Admin Access
- **Email**: `admin@demo-pharmacy.com`
- **Password**: `admin123`
- **Role**: Pharmacy Admin
- **Access**: Full access to all features including user management, settings, and billing

### Manager Access
- **Email**: `manager@demo-pharmacy.com`
- **Password**: `manager123`
- **Role**: Manager
- **Access**: Dashboard, POS, Inventory, Sales, Purchases, Reports

### Pharmacist Access
- **Email**: `pharmacist@demo-pharmacy.com`
- **Password**: `pharmacist123`
- **Role**: Pharmacist
- **Access**: POS, Products, Customers, Returns

### Cashier Access
- **Email**: `cashier@demo-pharmacy.com`
- **Password**: `cashier123`
- **Role**: Cashier
- **Access**: POS only

---

## Password Reset

### For Pharmacy/Staff Accounts
1. Go to Login page: `/login`
2. Click "Forgot Password?"
3. Enter email address
4. Check email for reset link
5. Set new password

### Password Reset API Endpoint
- **URL**: `/api/auth/reset-password/request`
- **Method**: POST
- **Body**: `{ "email": "user@example.com" }`

### Update Password API Endpoint
- **URL**: `/api/auth/reset-password/update`
- **Method**: POST  
- **Body**: `{ "password": "newpassword123" }`

---

## Features by Role

### Pharmacy Admin
All features including:
- Dashboard with real-time stats
- POS (Point of Sale)
- Inventory Management
- Product CRUD
- Purchase Orders
- Suppliers Management
- Customer Management
- Sales & Receipts
- Returns Management
- Financial Reports
- Ledger & Credits
- User Management (create/manage staff)
- Settings (8 tabs: General, Financial, Inventory, Receipts, Notifications, Backup, Security, Billing)
- Subscription Management
- Export data (CSV/PDF)

### Manager
All features except:
- User Management
- Settings (Billing tab only for subscription info)

### Pharmacist
- POS
- Products
- Customers
- Returns
- Reports

### Cashier
- POS only

### Inventory Clerk
- Inventory
- Products
- Purchases
- Suppliers
- Reports

### Accountant
- Financial Reports
- Ledger
- Credits
- Accounting

### Reporting Analyst
- All Reports
- Sales Reports
- Inventory Reports
- Profit/Loss Reports
- Export Reports

### Sales Representative
- Sales & Receipts
- Customers
- Returns
- Sales Reports

### Support Agent
- Dashboard (read-only)
- Customers
- Returns
- Notifications

### Procurement Officer
- Purchases
- Suppliers
- Inventory
- Reports

### Warehouse Supervisor
- Inventory
- Products
- Purchases

### Delivery Coordinator
- Sales (read-only)
- Customers

---

## Payment Methods Supported
- Cash
- Credit (pay-later)
- Card
- EasyPaisa
- JazzCash
- Mixed

---

## Subdomain System
For production deployment, pharmacies can be accessed via subdomains:
- Super Admin: `superadmin.pharmapos.com`
- Demo Pharmacy: `demo-pharmacy.pharmapos.com`
- Other Pharmacies: `{pharmacy-slug}.pharmapos.com`

**Note**: Subdomain routing is implemented in middleware. Update DNS records in production.

---

## Daily Backup System
- **Endpoint**: `/api/backup/daily`
- **Method**: GET
- **Cron Job**: Runs daily at 2:00 AM (Pakistan Time)
- **Backup Data**: Sales count, Products count, Purchases count per pharmacy
- **Last Backup**: Tracked in `backup_schedules` table

### Vercel Cron Configuration
```json
{
  "crons": [{
    "path": "/api/backup/daily",
    "schedule": "0 21 * * *"
  }]
}
```

---

## API Routes

### Admin Routes
- `POST /api/admin/change-password` - Change any user's password (Super Admin/Admin only)

### Stripe Routes
- `POST /api/stripe/checkout` - Create Stripe checkout session for subscription
- `GET /api/stripe/checkout?session_id=xxx` - Get checkout session status
- `POST /api/stripe/cancel` - Cancel subscription

### Super Admin Routes
- `POST /api/superadmin/create-pharmacy` - Create new pharmacy account

### Backup Routes
- `GET /api/backup/daily` - Daily backup job (protected by CRON_SECRET)

---

## Database Tables
- `pharmacies` - Pharmacy accounts with subscription details
- `users` - User accounts with role-based permissions
- `products` - Product catalog with inventory tracking
- `inventory_batches` - FIFO batch tracking
- `sales` - Sales transactions
- `held_sales` - Suspended transactions
- `purchases` - Purchase orders (7 types)
- `returns` - Product returns
- `suppliers` - Supplier information
- `customers` - Customer CRM
- `categories` - Product categories
- `ledger` - Financial transactions
- `credits` - Credit sales tracking
- `stripe_payments` - Stripe subscription payments
- `super_admins` - Super admin accounts
- `notifications` - System alerts
- `audit_logs` - Audit trail
- `system_error_logs` - Error logging
- `backup_schedules` - Backup configuration

---

## Security Features
- Multi-tenant data isolation (Row Level Security)
- Pharmacy-aware RLS policies
- Automatic pharmacy_id assignment on INSERT (database triggers)
- Subscription status validation
- Suspended account handling
- 12 user roles with granular permissions
- Password reset via email
- Session management with inactivity checks

---

## Currency & Tax
- **Currency**: PKR (Pakistani Rupee)
- **Tax Rate**: 5% (configurable)

---

## Support
For issues or questions, contact:
- Email: support@pharmapos.com
- Documentation: See AGENTS.md for project guidelines

---

## Recent Fixes (February 19, 2026)

### Authentication System Updates
- Fixed RLS function `get_user_pharmacy_id()` to use `auth_user_id` instead of `id`
- Updated auth context to properly link users via `auth_user_id`
- Fixed middleware user lookup to use correct auth ID
- Removed duplicate superadmin record from users table
- All login flow now uses proper authenticated user ID mapping

### Database Triggers
- Automatic `pharmacy_id` assignment on all INSERT operations
- Multi-tenant isolation enforced at database level
- RLS policies properly restrict data by pharmacy

## Last Updated
- Date: February 19, 2026
- Version: 1.1.0
