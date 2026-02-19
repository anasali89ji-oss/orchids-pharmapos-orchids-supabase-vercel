# Access Permissions Summary

## Role-Based Access Control

PharmaPOS implements a comprehensive role-based access control (RBAC) system with the following roles:

### 1. Super Admin
- Full system access
- Manage all pharmacies
- Create/Invite users
- View all reports
- Manage all data

### 2. Pharmacy Admin
- Full pharmacy management access
- Manage users within pharmacy
- View all reports
- Manage all pharmacy data
- Cannot change subscription status (super admin only)

### 3. Manager
- View and manage reports
- Process sales
- Manage inventory and purchases
- Manage customers and suppliers
- View accounting reports
- Cannot manage users or change settings

### 4. Pharmacist
- Process sales at POS
- View and manage products
- Cannot access inventory, reports, accounting

### 5. Cashier
- Process sales at POS
- Process returns
- View customers
- Cannot manage inventory or products

### 6. Inventory Clerk
- Manage inventory
- Manage purchases and suppliers
- Manage products
- Cannot process sales or view reports

### 7. Accountant
- View and manage accounting reports
- View ledger and credits
- Process returns
- View products, purchases
- Cannot process sales or manage inventory

### 8. Reporting Analyst
- View all reports
- Export data
- View products, purchases, suppliers, ledger, credits
- Cannot process sales or modify data

### 9. Sales Representative
- Process sales
- Manage credits and customers
- Cannot manage inventory or view reports

### 10. Support Agent
- Process sales and returns
- Manage customers and suppliers
- Cannot manage inventory or view reports

### 11. Procurement Officer
- Manage inventory
- Manage purchases and suppliers
- Manage products
- Cannot process sales

### 12. Warehouse Supervisor
- Manage inventory
- View reports
- Manage purchases
- Cannot process sales

### 13. Delivery Coordinator
- Process sales
- Manage customers and credits
- Cannot manage inventory

## Permission Matrix

| Module                | SA | PA | MGR | PH | CS | IC | ACC | RA | SR | SUP | PO | WS | DC |
|-----------------------|----|----|-----|----|----|----|-----|----|----|-----|----|----|----|
| Dashboard             | X  | X  | X   |    |    |    | X   | X  |    |     |    | X  |    |
| POS (Sales)           | X  | X  | X   | X  | X  |    |     |    | X  | X   |    |    | X  |
| Held Sales            | X  | X  | X   | X  | X  |    |     |    | X  | X   |    |    | X  |
| Products (Manage)     | X  | X  | X   | X  |    | X  |     |    |    |     | X  | X  |    |
| Products (View)       | X  | X  | X   | X  | X  | X  | X   | X  |    |     | X  | X  |    |
| Inventory             | X  | X  | X   |    |    | X  |     |    |    |     | X  | X  |    |
| Suppliers             | X  | X  | X   |    |    | X  |     | X  |    | X   | X  |    |    |
| Purchases             | X  | X  | X   |    |    | X  |     | X  |    |     | X  | X  |    |
| Returns               | X  | X  | X   |    | X  |    | X   |    |    | X   |    |    |    |
| Reports               | X  | X  | X   |    |    |    | X   | X  |    |     |    | X  |    |
| Accounting            | X  | X  | X   |    |    |    | X   |    |    |     |    |    |    |
| Ledger (View)         | X  | X  | X   |    |    |    | X   | X  |    |     |    |    |    |
| Credits (Manage)      | X  | X  | X   |    |    |    | X   |    | X  |     |    |    | X  |
| Credits (View)        | X  | X  | X   |    |    |    | X   | X  | X  |     |    |    | X  |
| Customers             | X  | X  | X   |    | X  |    |     |    | X  | X   |    |    | X  |
| Settings              | X  | X  | X   |    |    |    |     |    |    |     |    |    |    |
| User Management       | X  | X  |     |    |    |    |     |    |    |     |    |    |    |

Legend:
- SA: Super Admin
- PA: Pharmacy Admin
- MGR: Manager
- PH: Pharmacist
- CS: Cashier
- IC: Inventory Clerk
- ACC: Accountant
- RA: Reporting Analyst
- SR: Sales Representative
- SUP: Support Agent
- PO: Procurement Officer
- WS: Warehouse Supervisor
- DC: Delivery Coordinator

## RLS Policies Enforcement

All database tables have Row Level Security (RLS) policies enforced:
- Users can only see data from their pharmacy
- Super admins can see all pharmacies
- All write operations are pharmacy-scoped
- Multi-tenant data isolation is guaranteed

## API Route Protection

All API routes authenticate users and check permissions:
- `/api/*` routes verify auth tokens
- Pharmacy isolation enforced on reads/writes
- Role-based access checked for sensitive operations
