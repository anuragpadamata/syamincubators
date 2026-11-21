# Syam Incubators - Complete Project Documentation

> Full-stack web application for managing an egg incubation business. Customers bring eggs, the shop incubates them, and returns hatched chicks.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Business Logic](#business-logic)
5. [Server (Backend)](#server-backend)
6. [Client (Frontend)](#client-frontend)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Authentication](#authentication)
10. [Features](#features)
11. [Print System](#print-system)
12. [Telugu Transliteration](#telugu-transliteration)
13. [CSS Design System](#css-design-system)
14. [Configuration & Environment](#configuration--environment)
15. [Running the Application](#running-the-application)

---

## Overview

**Syam Incubators** is a mobile-first web application built for managing an egg incubation business located in a Telugu-speaking region (Andhra Pradesh / Telangana, India). The core workflow is:

1. Customer brings eggs to the shop
2. Shop records the sale (customer info, egg count, date, payment)
3. Eggs are incubated for a configurable period (default 21 days)
4. A few days before delivery, eggs are transferred to the hatchery (rotation stopped)
5. Chicks hatch and are returned to the customer on the delivery date
6. Balance payments are tracked

The app is primarily used on mobile phones.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | ^19.3.1 |
| Routing | react-router-dom | ^7.18.4 |
| Build Tool | Vite | ^8.3.4 |
| Linter | OxLint | ^1.88.0 |
| Backend | Express.js | ^4.21.0 |
| ORM | Sequelize | ^6.37.3 |
| Database | PostgreSQL | 18 |
| Auth | JWT (jsonwebtoken) | ^9.0.2 |
| Dev Runner | concurrently | ^8.2.2 |

---

## Project Structure

```
C:\Project\
├── package.json                  # Root monorepo - runs both server & client
├── .gitignore                    # node_modules/, .env, dist/, .DS_Store
├── CLAUDE.md                     # AI coding guidelines
│
├── server/
│   ├── package.json              # syam-incubators-server
│   ├── .env                      # Database URL, JWT secret, admin credentials
│   └── src/
│       ├── index.js              # Express entry point, route mounting, SPA fallback
│       ├── config/
│       │   └── database.js       # Sequelize instance (PostgreSQL connection)
│       ├── models/
│       │   ├── Customer.js       # Customer model with virtual fields
│       │   └── Setting.js        # Key-value settings store
│       ├── routes/
│       │   ├── auth.js           # POST /api/auth/login
│       │   ├── customers.js      # CRUD + hatchery endpoint
│       │   ├── settings.js       # GET/PUT for 3 configurable settings
│       │   └── transliterate.js  # Telugu transliteration via Google API
│       ├── middleware/
│       │   └── auth.js           # JWT verification middleware
│       └── seeders/
│           └── seed.js           # Seeds default_incubation_days setting
│
├── client/
│   ├── package.json              # React client
│   ├── index.html                # SPA entry (title: "Syam Incubators")
│   ├── vite.config.js            # React plugin + /api proxy to localhost:3000
│   ├── .oxlintrc.json            # OxLint config (React rules)
│   ├── public/
│   │   └── favicon.svg           # Vite default lightning bolt
│   └── src/
│       ├── main.jsx              # ReactDOM root render
│       ├── App.jsx               # Router + Layout + ProtectedRoute wrapper
│       ├── api.js                # Fetch wrapper with JWT + all API methods
│       ├── index.css             # Complete styling (CSS variables, responsive, print)
│       ├── context/
│       │   └── AuthContext.jsx   # JWT token state, login/logout, localStorage
│       ├── components/
│       │   ├── Navbar.jsx        # Top nav with hamburger menu
│       │   └── ProtectedRoute.jsx # Auth gate -> redirect to /login
│       └── pages/
│           ├── LoginPage.jsx     # Username/password login form
│           ├── CustomerListPage.jsx  # Sales page (list, filter, sort, search, print)
│           ├── CustomerFormPage.jsx  # New Sale / Edit form with autocomplete
│           ├── HatcheryListPage.jsx  # Hatchery transfer tracking
│           └── SettingsPage.jsx      # Configure incubation/hatchery/price defaults
```

---

## Business Logic

### Incubation Lifecycle

```
Day 0: Eggs received (date_received)
  |
  | Incubation period (default 21 days, configurable per sale)
  |
Day 18: Hatchery transfer (incubation_days - hatchery_days_before)
  |      Eggs moved from incubator to hatchery, rotation stopped
  |
Day 21: Delivery date (date_received + incubation_days)
         Chicks ready for customer pickup
```

### Key Formulas

| Computation | Formula |
|------------|---------|
| **Hatchery Date** | `date_received + incubation_days - hatchery_days_before` |
| **Delivery Date** | `date_received + incubation_days` |
| **Total Amount** | `price_per_egg * num_eggs` |
| **Balance** | `total_amount - amount_paid` |
| **Customer ID** | `"INC_" + id.toString().padStart(4, '0')` (e.g., INC_0001) |

### Daily Serial Numbering

Each sale gets a per-date serial number (S.No) based on its `createdAt` timestamp order within its `date_received` group. Resets to 1 for each new date.

### Configurable Settings

| Setting | Key in DB | Default | Per-sale Override |
|---------|-----------|---------|-------------------|
| Incubation Days | `default_incubation_days` | 21 | Yes (`incubation_days` field) |
| Hatchery Days Before | `hatchery_days_before` | 3 | No (global) |
| Price per Egg | `default_price_per_egg` | 15 | Yes (`price_per_egg` field) |

---

## Server (Backend)

### Entry Point: `server/src/index.js`

- Express server on PORT 3000 (configurable via env)
- Middleware: CORS (open), JSON body parser
- Route mounting with JWT authentication on all data routes
- Serves built client from `client/dist/` with SPA fallback
- Database sync on startup (`sequelize.sync({ force: false })`)

### Models

#### Customer (`server/src/models/Customer.js`)

**Persisted Fields:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `customer_name` | STRING(255) | Yes | - |
| `num_eggs` | INTEGER | Yes | - |
| `village_city` | STRING(255) | Yes | - |
| `mobile_number` | STRING(20) | Yes | - |
| `egg_mark` | STRING(255) | No | null |
| `date_received` | DATEONLY | Yes | NOW |
| `incubation_days` | INTEGER | Yes | 21 |
| `price_per_egg` | DECIMAL(10,2) | Yes | 15 |
| `amount_paid` | DECIMAL(10,2) | Yes | 0 |

**Virtual (Computed) Fields:**

| Field | Computation |
|-------|------------|
| `customerId` | `"INC_" + id.padStart(4, '0')` |
| `deliveryDate` | `date_received + incubation_days` |
| `total_amount` | `price_per_egg * num_eggs` |
| `balance` | `total_amount - amount_paid` |

#### Setting (`server/src/models/Setting.js`)

Simple key-value store with `key` (STRING, unique) and `value` (STRING) columns.

### Middleware

**`server/src/middleware/auth.js`** - JWT authentication:
- Extracts Bearer token from Authorization header
- Verifies with `JWT_SECRET` from environment
- Attaches decoded payload to `req.user`
- Returns 401 on missing/invalid token

### Seeder (`server/src/seeders/seed.js`)

Run via `npm run seed`. Creates tables if missing and seeds `default_incubation_days = 21` using `findOrCreate`.

---

## Client (Frontend)

### Routing (`client/src/App.jsx`)

| Path | Component | Auth Required |
|------|-----------|--------------|
| `/login` | LoginPage | No |
| `/` | CustomerListPage | Yes |
| `/customers/new` | CustomerFormPage | Yes |
| `/customers/:id/edit` | CustomerFormPage | Yes |
| `/hatchery` | HatcheryListPage | Yes |
| `/settings` | SettingsPage | Yes |

### Auth Context (`client/src/context/AuthContext.jsx`)

- Stores JWT token in localStorage and React state
- Provides `login(token)`, `logout()`, `isAuthenticated`, `token`
- `useAuth()` hook for consuming components

### API Client (`client/src/api.js`)

Centralized fetch wrapper that:
- Adds `Authorization: Bearer <token>` header to all requests
- Auto-redirects to `/login` on 401 responses
- Removes stored token on 401
- 11 API methods covering auth, customers, settings, and transliteration

### Pages

#### CustomerListPage (Sales) - Main Page

The most complex page. Handles:
- **Customer listing** with table (desktop) and card (mobile) views
- **Search** by name, village, or mobile number
- **Date filtering**: All, Today, Yesterday, Tomorrow, Custom date, Date range (From/To)
- **Sorting**: Newest first / Oldest first
- **Collapse/Expand**: Cards start collapsed on mobile, with per-card and bulk toggle
- **Print system**: 4 print modes via dialog
- **Delete** with confirmation

**State:** 14 state variables managing customers, filters, sort, print, card expansion, and Telugu translations.

**Memoized computations:**
- `dailySerial` - per-date serial numbers
- `filteredCustomers` - search + date filter + sort applied
- `groupedByDate` - customers grouped by date_received for separate-pages print

#### CustomerFormPage (New Sale / Edit)

- **New mode**: Pre-fills defaults from settings (incubation days, price per egg)
- **Edit mode**: Loads existing customer data
- **Autocomplete** (New mode only, debounced 300ms, triggers at 2+ chars):
  - Customer name: fills name, mobile, village, egg mark, and price
  - Mobile number: fills only mobile
  - Village: fills only village
- **Billing display**: Shows computed total, paid, and balance
- **Delivery date display**: Shows computed delivery date

#### HatcheryListPage

- Date picker to view transfers for any date
- "Today's Transfers" section with table + card views
- "Upcoming 7 Days" section (only shown when viewing today)
- Groups transfers by date with day labels (Today, Tomorrow, weekday names)

#### SettingsPage

Three configurable settings with input fields and a single Save button:
- Default Incubation Days
- Hatchery Days Before Delivery
- Default Price per Egg (Rs)

#### LoginPage

Simple username/password form. Single admin user.

### Components

#### Navbar

- Brand: "Syam Incubators" (links to Sales page)
- Hamburger menu on mobile (animated 3-bar to X transition)
- Links: Sales, New Sale, Hatchery, Settings, Logout
- Active link highlighting

#### ProtectedRoute

Redirects to `/login` if not authenticated.

---

## Database Schema

### PostgreSQL Database: `syam_incubators`

**Connection:** `postgres://postgres:GeAero%40SMO@localhost:5432/syam_incubators`

### Tables

#### `customers`

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, auto-increment |
| customer_name | VARCHAR(255) | NOT NULL |
| num_eggs | INTEGER | NOT NULL |
| village_city | VARCHAR(255) | NOT NULL |
| mobile_number | VARCHAR(20) | NOT NULL |
| egg_mark | VARCHAR(255) | NULLABLE |
| date_received | DATE | NOT NULL, default NOW |
| incubation_days | INTEGER | NOT NULL, default 21 |
| price_per_egg | DECIMAL(10,2) | NOT NULL, default 15 |
| amount_paid | DECIMAL(10,2) | NOT NULL, default 0 |
| created_at | TIMESTAMP | Auto-managed |
| updated_at | TIMESTAMP | Auto-managed |

#### `settings`

| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, auto-increment |
| key | VARCHAR(100) | NOT NULL, UNIQUE |
| value | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | Auto-managed |
| updated_at | TIMESTAMP | Auto-managed |

---

## API Endpoints

### Authentication (No auth required)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/login` | `{ username, password }` | `{ token }` |

### Customers (Auth required)

| Method | Endpoint | Body/Query | Response |
|--------|----------|-----------|----------|
| GET | `/api/customers` | `?search=term` | `[Customer]` |
| GET | `/api/customers/hatchery` | - | `[Customer + hatcheryDate]` |
| GET | `/api/customers/:id` | - | `Customer` |
| POST | `/api/customers` | Customer fields | `Customer` (201) |
| PUT | `/api/customers/:id` | Customer fields | `Customer` |
| DELETE | `/api/customers/:id` | - | `{ message: 'Deleted' }` |

### Settings (Auth required)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/settings/incubation-days` | - | `{ value }` |
| PUT | `/api/settings/incubation-days` | `{ value }` | `{ value }` |
| GET | `/api/settings/hatchery-days-before` | - | `{ value }` |
| PUT | `/api/settings/hatchery-days-before` | `{ value }` | `{ value }` |
| GET | `/api/settings/price-per-egg` | - | `{ value }` |
| PUT | `/api/settings/price-per-egg` | `{ value }` | `{ value }` |

### Transliteration (Auth required)

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/transliterate` | `{ texts: string[] }` | `{ results: { [input]: telugu } }` |

---

## Authentication

- **Single-admin system** - no user registration, no database user table
- Credentials stored in `.env` (ADMIN_USER=admin, ADMIN_PASS=admin123)
- JWT tokens signed with `JWT_SECRET`, expire after 7 days
- Token stored in browser localStorage
- All data routes protected by JWT middleware
- 401 responses trigger automatic redirect to login page

---

## Features

### 1. Sales Management (CRUD)
- Create new sales with customer info, egg count, pricing, payment
- Edit existing sales
- Delete with confirmation
- List all sales with search, filter, and sort

### 2. Search
- Client-side filtering by customer name, village, or mobile number
- Case-insensitive partial matching

### 3. Date Filtering
- Quick filters: All, Today, Yesterday, Tomorrow
- Custom date picker for specific date
- Date range filter (From/To) for ranges like "1st Dec to 31st Dec"

### 4. Sorting
- Toggle between Newest First and Oldest First (by createdAt)

### 5. Autocomplete (New Sale form)
- Triggers on 2+ character input, debounced 300ms
- Field-specific behavior:
  - **Customer name**: auto-fills name, mobile, village, egg mark, price (from historical data)
  - **Mobile number**: fills only mobile
  - **Village**: fills only village
- Only active in New mode (not Edit)

### 6. Hatchery Transfer Tracking
- Dedicated page showing eggs ready for hatchery transfer
- Date picker for viewing any day's transfers
- Upcoming 7-day view grouped by date
- Hatchery date = date_received + incubation_days - hatchery_days_before

### 7. Billing & Payment Tracking
- Total computed: price_per_egg * num_eggs
- Balance computed: total - amount_paid
- Color-coded display: red for balance due, green for cleared

### 8. Collapse/Expand Cards (Mobile)
- Cards start collapsed showing only header info
- Per-card toggle with animated chevron
- Bulk "Expand All" / "Collapse All" button

### 9. Responsive Design (Mobile-First)
- Hamburger navigation menu on mobile
- Table view on desktop, card view on mobile (breakpoint: 1024px)
- 44px minimum touch targets
- Safe area insets for notched phones
- System font stack

### 10. Configurable Settings
- Default incubation days (per-sale overridable)
- Hatchery days before delivery (global)
- Default price per egg (per-sale overridable)

---

## Print System

### Print Modes

The app supports 4 print modes, selected via a dialog when the Print button is clicked:

#### 1. Single Page
- All orders in one continuous table
- Header: "Syam Incubators - Sales Report" with filter label and count
- 16-column table (S.No through Balance)

#### 2. Separate Pages
- One page per date_received group
- Each page has its own header with:
  - Center: "Syam Incubators", formatted date, order count
  - Right: Hatching date, Delivery date
- Page break between each date group

#### 3. Day Print (Labels) - English
- Label cards for egg categorization
- 3 cards per row, 2 copies per customer (for start and end of incubation)
- Each label shows: Name, Village, Eggs, Mark, Hatchery date, Delivery date, Paid, Balance (bold)
- Cards have fixed 1/3 width (don't stretch when row has fewer than 3)
- Text centered in each card

#### 4. Day Print (Telugu) - Bilingual Duplex
- Designed for duplex printing
- Pages of 6 customers (2 rows of 3)
- Front page: English labels
- Back page: Telugu labels with reversed column order (for duplex alignment)
- Telugu field labels: పేరు, గ్రామం, గుడ్లు, గుర్తు, హ్యాచరీ, డెలివరీ, చెల్లించినది, బాకీ
- Customer data transliterated via Google Input Tools API

### Print CSS Implementation

- Print sections hidden on screen (`display: none`)
- CSS class toggling on `.page` div controls which section is visible in print:
  - `.print-mode-single` / `.print-mode-separate` / `.print-mode-labels` / `.print-mode-labels-telugu`
- `@page { size: A4; margin: 8mm 0 0 0 }` - minimal top margin, sides at printer minimum
- `page-break-after: always` for date group separators
- `page-break-inside: avoid` on label groups
- Label cards: `flex: 0 0 calc((100% - 12px) / 3)` for consistent 3-up layout

---

## Telugu Transliteration

### How It Works

1. User clicks "Day Print (Telugu)" in the print dialog
2. Client extracts all unique customer names, villages, and egg marks
3. Sends batch to `POST /api/transliterate`
4. Server calls Google Input Tools API for each unique text
5. Results cached in-memory (Map) on server to avoid repeated API calls
6. Client stores results in `teluguMap` state
7. Telugu labels render using `teluguMap[englishText]` lookup

### Google Input Tools API

- **URL**: `https://inputtools.google.com/request`
- **Parameters**: `text=<input>&itc=te-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`
- **`itc=te-t-i0-und`**: Telugu transliteration mode
- **Free**, no API key required
- **Transliterates** (not translates): converts Roman script to Telugu script phonetically
  - Example: "Manga" -> "మంగ", "Ongole" -> "ఒంగోలు"

### Duplex Alignment

For duplex printing (long-edge flip), the Telugu back page reverses the column order within each row:
- Front (English): [C1, C2, C3]
- Back (Telugu): [C3, C2, C1]

This ensures that when the paper flips on the long edge, each English card aligns with its Telugu counterpart on the back.

---

## CSS Design System

### CSS Custom Properties

| Variable | Value | Purpose |
|----------|-------|---------|
| `--primary` | `#2563eb` | Primary blue |
| `--primary-hover` | `#1d4ed8` | Hover state |
| `--danger` | `#dc2626` | Danger/error red |
| `--danger-hover` | `#b91c1c` | Danger hover |
| `--success` | `#16a34a` | Success green |
| `--bg` | `#f8fafc` | Page background |
| `--surface` | `#ffffff` | Card background |
| `--text` | `#1e293b` | Primary text |
| `--text-muted` | `#64748b` | Muted text |
| `--border` | `#e2e8f0` | Border color |
| `--overdue` | `#fef2f2` | Overdue background |
| `--radius` | `8px` | Border radius |

### Responsive Breakpoints

| Breakpoint | Changes |
|-----------|---------|
| 1024px | Table -> Card view, card list shown |
| 768px | Hamburger menu, single-column forms, stacked buttons |

### Key Design Patterns

- **System font stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **44px minimum touch targets** for all interactive elements
- **Safe area insets** for notched phones (`env(safe-area-inset-*)`)
- **Hamburger menu** with animated 3-bar to X transition
- **Card-based mobile layout** with collapse/expand and chevron animation
- **Filter pills** with active state highlighting (rounded, pill-shaped buttons)
- **Print color adjustment**: `print-color-adjust: exact` for background colors in print

---

## Configuration & Environment

### Environment Variables (`server/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ADMIN_USER` | Admin login username |
| `ADMIN_PASS` | Admin login password |
| `PORT` | Server port (default: 3000) |

### Vite Proxy (`client/vite.config.js`)

Dev server proxies `/api` requests to `http://localhost:3000` (the Express backend).

### Root Scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `concurrently "npm run dev:server" "npm run dev:client"` | Run both in parallel |
| `dev:server` | `cd server && npm run dev` | Server with file watching |
| `dev:client` | `cd client && npm run dev` | Vite dev server |

### Server Scripts (`server/package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `node --watch src/index.js` | Dev mode with auto-reload |
| `start` | `node src/index.js` | Production start |
| `seed` | `node src/seeders/seed.js` | Seed default settings |

### Client Scripts (`client/package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Dev server |
| `build` | `vite build` | Production build |
| `lint` | `oxlint` | Lint check |
| `preview` | `vite preview` | Preview production build |

---

## Running the Application

### Prerequisites

- Node.js 18+ (required for built-in `fetch` used in transliteration)
- PostgreSQL 18

### Setup

```bash
# 1. Install dependencies
cd C:\Project
npm install
cd server && npm install
cd ../client && npm install

# 2. Configure environment
# Edit server/.env with your PostgreSQL credentials

# 3. Seed database
cd server && npm run seed

# 4. Run both server and client
cd .. && npm run dev
```

### Access

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3000/api
- **Login**: username `admin`, password `admin123`

---

## Dependencies Summary

### Server (7 packages)

| Package | Purpose |
|---------|---------|
| express | HTTP framework |
| sequelize | PostgreSQL ORM |
| pg / pg-hstore | PostgreSQL driver |
| jsonwebtoken | JWT auth |
| cors | Cross-origin requests |
| dotenv | Environment variables |

### Client (3 runtime + 4 dev)

| Package | Purpose |
|---------|---------|
| react / react-dom | UI framework |
| react-router-dom | Client-side routing |
| @vitejs/plugin-react | Vite React support |
| vite | Build tool |
| oxlint | Linter |

---

*Document generated on 2026-10-26. This captures the complete application context including all files, business logic, features, and implementation details.*
