# 📘 Omada Sales Suite — Comprehensive Project Documentation & Architecture Guide

Welcome to the **Omada Sales Suite** developer and workflow documentation. This guide details the system architecture, business workflows, data flows between modules, database schema, and API interactions.

---

## 📑 Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Project Structure](#2-project-structure)
3. [Authentication & Role-Based Access Control (RBAC)](#3-authentication--role-based-access-control-rbac)
4. [Core Modules & Workflows](#4-core-modules--workflows)
   - [4.1 Sales Records & Department Leads (CRM)](#41-sales-records--department-leads-crm)
   - [4.2 Quotation Management](#42-quotation-management)
   - [4.3 Sample Management](#43-sample-management)
   - [4.4 Order Export (Production & Supplier Orders)](#44-order-export-production--supplier-orders)
   - [4.5 Master Data Catalog (Products & Companies)](#45-master-data-catalog-products--companies)
   - [4.6 Executive Dashboard](#46-executive-dashboard)
   - [4.7 User & Team Management](#47-user--team-management)
5. [End-to-End Cross-Module Data Flow](#5-end-to-end-cross-module-data-flow)
6. [Database Schema & ERD](#6-database-schema--erd)
7. [API Route Specifications](#7-api-route-specifications)
8. [Setup, Migrations & Operations](#8-setup-migrations--operations)

---

## 1. System Overview & Architecture

**Omada Sales Suite** is a full-stack enterprise sales, lead-tracking, quotation-generation, and order-export platform designed for tile/stone/interior manufacturing and trading businesses.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  - React 18, TypeScript, Tailwind CSS, Shadcn UI / Radix    │
│  - TanStack React Query, React Router v6                    │
│  - jsPDF + autoTable, html-to-image (Export Engine)         │
│  - Lucide Icons, Leaflet / Geolocation Map Integration      │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (JSON / JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)               │
│  - Express 5, TypeScript                                    │
│  - JWT Bearer Authentication & Role-Based Middleware        │
│  - Centralized connection pool via `pg`                     │
│  - Product auto-sync & catalog upsert engine                │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries / Transactions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                     │
│  - Relational Schema with Foreign Key Constraints & Cascades│
│  - Custom Sequences for Order & Quotation Numbers           │
│  - B-Tree Indexes for High-Speed Filter & Pagination        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
omada/
├── backend/
│   ├── db/
│   │   ├── schema.sql                   # Base DDL for all PostgreSQL tables
│   │   ├── sequence_and_pagination.sql  # Sequences & pagination indexes
│   │   ├── production_optimizations.sql # Composite query performance indexes
│   │   └── seed.sql                     # Reference SQL seed data
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts       # Login, user registration, user CRUD
│   │   │   ├── dashboard.controller.ts  # KPI metric aggregation
│   │   │   ├── master.controller.ts     # Master products & companies CRUD + dynamic usage
│   │   │   ├── quotations.controller.ts # Quotation/Sample CRUD, items, and auto-sync
│   │   │   └── sales.controller.ts      # Sales leads, dynamic filters, follow-ups
│   │   ├── middleware/
│   │   │   └── auth.ts                  # JWT token verification & user context injection
│   │   ├── routes/                      # Express route definitions
│   │   ├── db.ts                        # PostgreSQL pg.Pool configuration
│   │   ├── index.ts                     # Express server setup, CORS, route mounting
│   │   └── utils.ts                     # Product master upsert logic & case mappers
│   ├── migrate.cjs                      # Auto-migration script (base schema + alters)
│   ├── seed.cjs                         # Seed script (creates default admin user)
│   ├── .env                             # Backend port, database credentials, JWT secret
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── assets/                      # Static branding (Omada logo)
│   │   ├── components/
│   │   │   ├── sales/                   # Department-specific lead forms
│   │   │   │   ├── BuildersForm.tsx
│   │   │   │   ├── ArchitectsForm.tsx
│   │   │   │   ├── ContractorsForm.tsx
│   │   │   │   ├── EndToEndForm.tsx
│   │   │   │   ├── FollowUpManager.tsx  # Timeline & follow-up scheduler
│   │   │   │   └── LocationPicker.tsx   # Geolocation / coordinates picker
│   │   │   ├── ui/                      # Shadcn UI reusable components (Dialog, Input, etc.)
│   │   │   ├── AppLayout.tsx            # Sidebar navigation, department switcher, user profile
│   │   │   └── CustomPagination.tsx     # Reusable server-side pagination bar
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx          # JWT Auth state, login/logout, active department
│   │   ├── lib/
│   │   │   ├── api.ts                   # Fetch wrapper with Bearer token & 401 handling
│   │   │   └── utils.ts                 # Formatting helpers, classnames merger
│   │   ├── pages/                       # Route views
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── DepartmentSelectionPage.tsx
│   │   │   ├── SalesPage.tsx
│   │   │   ├── QuotationPage.tsx
│   │   │   ├── SampleManagementPage.tsx
│   │   │   ├── OrderExportPage.tsx
│   │   │   ├── MasterDataPage.tsx
│   │   │   └── UserManagementPage.tsx
│   │   ├── App.tsx                      # Main React Router setup & protected routes
│   │   └── main.tsx
│   └── package.json
└── package.json                         # Root runner scripts
```

---

## 3. Authentication & Role-Based Access Control (RBAC)

### User Roles
1. **`Admin`**:
   - Has universal access to all departments, sales records, quotations, samples, master catalogs, and user management.
   - Can filter leads and quotations by specific salespersons.
   - Can create, edit, view plaintext passwords, and delete sales staff.
2. **Sales Staff (`User` / `Builders Sales` / `Architects / Interior Sales` / `Contractors / End-to-End` / `PMC`)**:
   - Access is restricted to their assigned department or their own created records.
   - Quotation and Sales Lead queries automatically filter by `created_by = user.id`.

### Authentication Flow
```
[User / Browser] ──( POST /api/auth/login )──> [Backend: auth.controller.ts]
                                                         │
                                               Verify bcrypt hash against DB
                                                         │
[User / Browser] <──( Return JWT + User Info )───────────┘
       │
Stores `omada_token` and `omada_user` in localStorage
Attaches `Authorization: Bearer <token>` on every subsequent API request
```

---

## 4. Core Modules & Workflows

### 4.1 Sales Records & Department Leads (CRM)
The sales module organizes prospective projects into **4 distinct business departments**:
1. **Builders / Developers**: Captures Site Name, Site Supervisor, PMC Company, Structural Engineer, Architect, and GPS Location.
2. **Architects / Interior Designers**: Captures Firm Name, Principal Architect, Interior Designer, Purchase Person, and Projects.
3. **Contractors**: Captures Contractor / Owner Name, Authorized Person, Firm Name, and Site details.
4. **End-to-End**: Captures Turnkey Client Name, Site Address, and primary decision makers.

#### Key Features:
- **Location Pinning**: Captures Latitude & Longitude with interactive Google Maps / Leaflet link.
- **Follow-up Engine**: Every lead can have unlimited timestamped follow-up logs (`follow_ups` table). Leads with pending follow-ups show badge alerts.
- **Full-Text Live Search**: Search across party names, firm names, phone numbers, notes, architect firms, and sales reps simultaneously.

---

### 4.2 Quotation Management
The Quotation module is an enterprise pricing and estimate builder.

#### Data Hierarchy:
```
┌─────────────────────────────────────────────────────────────┐
│                    QUOTATION (Header)                       │
│  - Quotation ID (e.g. Q-1001), Date, Status (Pending/Final) │
│  - Customer Name, Company, Mobile, Sales Ref, Site Address  │
│  - Include GST (18%), Extra Terms, Grand Total              │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               QUOTATION CATEGORIES (Sections)               │
│  - Category Name (e.g., "Living Room Tiles", "Facade")      │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   QUOTATION ITEMS (Rows)                    │
│  - Company, Design Name, Finish, Size                       │
│  - Quantity (Sq. Ft / Sq. Mtr), Multiplier, Boxes           │
│  - Unit Price, Total Price, Product Image (Base64 / URL)    │
└─────────────────────────────────────────────────────────────┘
```

#### Calculation Engine:
- `Total = Quantity × Unit Price`
- `Boxes = Quantity / Multiplier`
- `Grand Total = Σ(Category Item Totals)` (with optional 18% GST calculation).
- **Auto-Sync to Master Catalog**: When a quotation is saved, any new tile/product in the quotation items is automatically extracted and upserted into `master_products` and `master_companies`.

#### Export Capabilities:
- **PDF Generation**: Generates branded Omada quotation sheets with item thumbnail images, company terms, and payment schedules.
- **PNG/Image Export**: High-resolution image capture for fast WhatsApp sharing.

---

### 4.3 Sample Management
- Operates identically to Quotations but is tagged with `type = 'Sample'`.
- Allows sales reps to prepare sample requisition slips given to architects, contractors, or clients.
- Does not affect commercial sales turnover figures on the dashboard.

---

### 4.4 Order Export (Production & Factory Orders)
- Converts confirmed/approved quotations (`status = 'Final'`) or direct order items into manufacturer-ready POs.
- Allows filtering items by manufacturer/supplier, stripping client price markups if needed, and generating factory-ready picking and dispatch lists.
- Exports to printable PDF and image sheets.

---

### 4.5 Master Data Catalog (Products & Companies)
A centralized catalog that powers auto-complete across the entire application:
1. **Master Companies**: List of all manufacturers, suppliers, builder firms, and architectural studios.
2. **Master Products**: List of all tile/stone designs categorized by `company`, `design`, `finish`, `size`, and `image`.
3. **Usage Tracker**: Dynamically computes how many times each product design has been quoted across all active quotations.

---

### 4.6 Executive Dashboard
Provides the management team with real-time KPI metrics:
- **Total Quotations Count & Value** (Excluding Samples).
- **Confirmed Orders Count** (`status = 'Final'`).
- **Pending Enquiries Count** (`status = 'Pending'`).
- **Total Samples Distributed**.
- **Total Sales Leads Generated**.
- **Recent Quotation & Lead Activity Stream**.

---

### 4.7 User & Team Management (Admin Only)
- Admins can add new sales representatives, select their primary department, and assign system roles.
- Plaintext password display is available to administrators to easily assist sales staff with login credentials.

---

## 5. End-to-End Cross-Module Data Flow

```
[ Step 1: Lead Capture ]
Sales Rep visits a construction site -> Fills Builders / Architects Form -> Creates Sales Record
                        │
                        ▼
[ Step 2: Follow-Up & Nurturing ]
Sales Rep logs meeting notes and next call date in FollowUpManager
                        │
                        ▼
[ Step 3: Quotation / Estimate Creation ]
Sales Rep creates Quotation -> Picks products from Master Catalog or types new ones -> Calculates pricing
                        │
                        ├───────────────────────────────────────────────────────┐
                        ▼                                                       ▼
[ Step 4: Catalog Auto-Upsert ]                                [ Step 5: Customer Delivery ]
Backend auto-saves any new product design                      Rep downloads branded PDF / image
into `master_products` & `master_companies`                     and sends to client via WhatsApp / Email
                        │                                                       │
                        ▼                                                       ▼
[ Step 6: Confirmation & Finalization ] ────────────────────────────────────────┘
Client approves estimate -> Quotation marked "Final"
                        │
                        ▼
[ Step 7: Order Export to Factory / Supplier ]
Order Export module groups items by Supplier -> Generates PO / Picking List for Dispatch
                        │
                        ▼
[ Step 8: Executive Analytics ]
Dashboard instantly reflects updated revenue, confirmed volume, and conversion metrics
```

---

## 6. Database Schema & ERD

```
 users
 ├── id (PK, SERIAL)
 ├── name, email, password, plain_password
 ├── role, selected_department, created_at
 │
 ├──< sales_records (1:N via created_by)
 │    ├── id (PK, SERIAL)
 │    ├── dept ('builders' | 'architects' | 'contractors' | 'end-to-end')
 │    ├── site_name, firm_name, contractor_owner_name, etc.
 │    ├── location, lat, lng, contact_number, notes
 │    ├── created_by (FK -> users.id)
 │    │
 │    └──< follow_ups (1:N via sales_record_id, CASCADE)
 │         ├── id (PK, SERIAL)
 │         ├── sales_record_id (FK -> sales_records.id)
 │         ├── date, notes, created_at
 │
 └──< quotations (1:N via created_by)
      ├── id (PK, VARCHAR(50) - e.g. Q-1001)
      ├── customer_name, company_name, mobile, sales_ref, site_address
      ├── grand_total, status ('Pending' | 'Final'), type ('Quotation' | 'Sample')
      ├── include_gst (BOOLEAN), extra_terms (TEXT)
      ├── created_by (FK -> users.id)
      │
      └──< quotation_categories (1:N via quotation_id, CASCADE)
           ├── id (PK, SERIAL)
           ├── quotation_id (FK -> quotations.id)
           ├── name (VARCHAR)
           │
           └──< quotation_items (1:N via category_id, CASCADE)
                ├── id (PK, SERIAL)
                ├── category_id (FK -> quotation_categories.id)
                ├── company, design, finish, size, image
                ├── multiplier, qty, unit_price, total, boxes

 master_companies
 ├── id (PK, SERIAL), name (UNIQUE), type, contact, status, created_at

 master_products
 ├── id (PK, SERIAL), company, design, finish, size, image, created_at
 └── UNIQUE(company, design, finish, size)
```

---

## 7. API Route Specifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| **POST** | `/api/auth/login` | Public | Authenticates user; returns JWT token + user metadata |
| **POST** | `/api/auth/register` | Admin | Creates new user/employee with role and auto-hashed password |
| **GET** | `/api/auth/users` | Admin | Returns list of all users with plain passwords |
| **DELETE**| `/api/auth/users/:id` | Admin | Removes a user |
| **PATCH** | `/api/auth/department` | User | Updates current user's active department |
| **GET** | `/api/sales` | User | Gets paginated department sales records with follow-ups |
| **POST** | `/api/sales` | User | Creates a new sales lead |
| **PUT** | `/api/sales/:id` | User | Updates an existing sales lead |
| **DELETE**| `/api/sales/:id` | User | Deletes a sales lead |
| **POST** | `/api/sales/:id/followups` | User | Adds a follow-up log to a sales record |
| **DELETE**| `/api/sales/followups/:id` | User | Deletes a follow-up log |
| **GET** | `/api/quotations` | User | Gets paginated quotations/samples with nested items |
| **POST** | `/api/quotations` | User | Creates quotation header, categories, items & auto-syncs catalog |
| **PUT** | `/api/quotations/:id` | User | Updates quotation and syncs nested items |
| **PATCH** | `/api/quotations/:id/status`| User | Toggles quotation status between `Pending` and `Final` |
| **DELETE**| `/api/quotations/:id` | User | Deletes quotation and cascades categories and items |
| **GET** | `/api/master/companies` | User | Paginated master company list with search |
| **POST** | `/api/master/companies` | User | Creates or upserts a master company |
| **PUT** | `/api/master/companies/:id` | User | Updates master company |
| **DELETE**| `/api/master/companies/:id` | User | Deletes master company |
| **GET** | `/api/master/products` | User | Paginated master product catalog with usage counter |
| **POST** | `/api/master/products` | User | Adds/upserts new design to master catalog |
| **PUT** | `/api/master/products/:id` | User | Updates product details or image |
| **DELETE**| `/api/master/products/:id` | User | Deletes product from master catalog |
| **GET** | `/api/dashboard` | User | Aggregates high-level KPIs and recent activity streams |

---

## 8. Setup, Migrations & Operations

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) running with a database named `omada_db`.

### Installation & Launch
1. **Backend**:
   ```bash
   cd backend
   npm install
   node migrate.cjs    # Runs schema creation and all table updates
   node seed.cjs       # Creates default Admin account (admin@omada.com / admin)
   npm run dev         # Starts backend on http://localhost:5000
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev         # Starts frontend on http://localhost:8080 or http://localhost:5173
   ```
3. **Default Admin Login**:
   - **Email**: `admin@omada.com`
   - **Password**: `admin`
