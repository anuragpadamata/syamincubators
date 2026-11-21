# Syam Incubators — Current Feature Inventory

> Every feature in the codebase as of 2026-10-29. File locations included for reference.

---

## 1. Authentication

| Feature | Detail | File |
|---|---|---|
| Login form | Username + password, single admin | `pages/LoginPage.jsx` |
| JWT token | Signed on server, 7-day expiry | `server/routes/auth.js` |
| Token storage | Stored in `localStorage` | `context/AuthContext.jsx` |
| Auto-logout | 401 response → clear token → redirect to `/login` | `api.js` |
| Protected routes | All pages except `/login` require valid token | `components/ProtectedRoute.jsx` |
| Admin credentials | `ADMIN_USER` / `ADMIN_PASS` from `.env` (no hashing) | `server/.env` |

---

## 2. Sales Page (`/`) — CustomerListPage

### Data Loading
- Fetches all customers on mount via `GET /api/customers`
- Fetches `hatchery_days_before` setting on mount
- Loading state shown while fetching

### Search
- Real-time client-side search as user types
- Matches against: customer name, village/city, mobile number
- Case-insensitive partial match

### Date Filters (6 modes)
| Mode | Behavior |
|---|---|
| All | No filter, shows everything |
| Today | Exact match on today's date |
| Yesterday | Exact match on yesterday |
| Tomorrow | Exact match on tomorrow |
| Custom | Date picker — exact match on chosen date |
| Range | Two date pickers — From / To (inclusive) |

### Sorting
- Toggle button: "Newest First" ↔ "Oldest First"
- Sorts by `created_at` timestamp

### Desktop Table View (hidden on mobile ≤1024px)
17 columns:
1. S.No (daily serial — resets per date, stable even when filtered)
2. Customer ID (INC_0001 format)
3. Order Date
4. Order Time
5. Customer Name
6. Eggs
7. Village / City
8. Mobile
9. Egg Mark
10. Date Received
11. Incubation Days
12. Hatchery Date (computed)
13. Delivery Date (computed, red if overdue)
14. Amount (Rs)
15. Paid (Rs)
16. Balance (Rs — red if >0, green if ≤0)
17. Actions (Edit + Delete icon buttons)

### Mobile Card View (shown ≤1024px)
- Cards start **collapsed** — only header visible
- Header: `#S.No  INC_XXXX  Name | Eggs badge | ▼ chevron`
- Tap header to expand/collapse individual card
- Chevron rotates 180° when open
- Expanded shows: date/time, village, mobile, egg mark, received date, incubation days, hatchery date, delivery date, amount, paid, balance, Edit + Delete buttons
- Red left border on overdue cards
- **Expand All / Collapse All** bulk toggle button

### Overdue Highlighting
- Rows/cards with `deliveryDate < today` → red background
- Delivery date cell/field → red text + bold
- Balance > 0 → red (`overdue` class)
- Balance ≤ 0 → green (`paid-clear` class)

### Delete
- Confirmation via `window.confirm`
- Removes from local state immediately on success
- Error alert on failure

---

## 3. New Sale / Edit Sale (`/customers/new`, `/customers/:id/edit`) — CustomerFormPage

### Form Fields (10 total)
| Field | Type | Required | Notes |
|---|---|---|---|
| Customer Name | text | Yes | Autocomplete |
| Number of Eggs | number (min 1) | Yes | |
| Mobile Number | tel | Yes | Autocomplete |
| Village / City | text | Yes | Autocomplete |
| Egg Mark | text | No | What mark is written on eggs |
| Seal | checkbox (Yes / No) | Yes | Defaults to "No". Keeps customer's eggs separately |
| Price per Egg | number (min 0, step 0.01) | Yes | Defaults from settings |
| Amount Paid | number (min 0, step 0.01) | No | Defaults to 0 |
| Date Received | date | Yes | Defaults to today |
| Incubation Days | number (min 1) | Yes | Defaults from settings |

### Autocomplete (New mode only, not Edit)
Triggers at ≥2 characters, debounced 300ms, calls `GET /api/customers?search=`:

| Field | Fill behavior on select |
|---|---|
| Customer Name | Fills: name + mobile + village + egg mark + price per egg |
| Mobile Number | Fills: mobile only |
| Village / City | Fills: village only |

- Dropdown hides on blur (200ms delay to allow click to register)
- Deduplicates suggestions by `(name + mobile)` pair

### Live Computed Display (read-only panels)
- **Billing panel**: Total = price × eggs | Paid | Balance (red if due, green if clear)
- **Delivery Date panel**: `date_received + incubation_days`, formatted DD/MM/YYYY

### Modes
- **New**: prefills incubation_days + price_per_egg from settings
- **Edit**: loads existing customer data, autocomplete disabled

---

## 4. Deliveries Page (`/deliveries`) — DeliveriesPage

### Features
- **Today's Deliveries**: Defaults to today's date, displaying all chick deliveries ready for customer pickup.
- **Date Picker**: Select any date to see scheduled deliveries for that day.
- **Quick Filters**: Today, Tomorrow, and "All Upcoming (Grouped)" buttons.
- **Grouped Deliveries (Ascending)**:
  - All upcoming deliveries grouped by `deliveryDate` and sorted in chronological ascending order.
  - Summarizes total order count and total egg count per delivery day.
- **Overdue Deliveries Section**: Automatically flags orders past their delivery date with pending balance due.
- **Desktop & Mobile Views**: Full-featured responsive table on desktop and touch-friendly cards on mobile with one-tap phone calling (`tel:`) and direct links to settle/edit.

---

## 5. Hatchery Page (`/hatchery`) — HatcheryListPage

### Features
- **Today's Transfers**: Date picker defaults to today's date, displaying all eggs scheduled for transfer from incubator to hatchery baskets.
- **Quick Filters**: Today, Tomorrow, and "All Upcoming (Grouped)" buttons.
- **Grouped Transfers (Ascending)**:
  - All upcoming transfers grouped by `hatcheryDate` and sorted in ascending chronological order.
  - Summarizes both total orders count and total egg count per transfer day.
- **Overdue / Missed Transfers**: Flags any orders where the transfer date was in the past and rotation needs to be stopped immediately.
- **Responsive Views**: Full table view on desktop and touch cards on mobile with one-tap phone calls and direct links to edit sales.
- **Hatchery Date Formula**: `hatcheryDate = date_received + incubation_days - hatchery_days_before`.

---

## 6. Print System (4 Modes) — inside CustomerListPage

Triggered by "Print" button → modal dialog with 4 options.
All 4 print sections always rendered in DOM, CSS class on root div controls which shows.

### Mode 1: Single Page
- All filtered customers in one continuous table
- Header: "Syam Incubators — Sales Report" + filter label + total count
- Same 16 columns as screen table (no Actions)

### Mode 2: Separate Pages (per date)
- One page per date group
- Page break between each date
- Header per page:
  - Center: "Syam Incubators" + date (DD/MM/YYYY) + count
  - Right: "Hatching: DD/MM/YYYY" + "Delivery: DD/MM/YYYY"
- 16-column table per page

### Mode 3: Day Print (Labels) — English
- Filtered customers split into chunks of 3
- Each chunk printed TWICE (2 identical rows) → each customer gets 2 labels
- Each label card contains:
  - Customer name (bold, large)
  - Village
  - Eggs count
  - Egg mark (or `-`)
  - Hatchery date
  - Delivery date
  - Amount paid
  - **Balance** (bold)
- Cards: fixed 1/3 width (3 per row, don't stretch if fewer)
- Paper: A4, 8mm top margin, sides at printer minimum

### Mode 4: Day Print (Telugu) — Bilingual Duplex
- Pages of 6 customers per physical sheet
- **English front page**: same layout as Mode 3 (forward order)
- **Telugu back page**: same layout but columns REVERSED within each row of 3
  - Reversed so cards align after long-edge duplex flip
- Telugu customer data: transliterated via Google Input Tools API
- Telugu field labels (hardcoded): గ్రామం, గుడ్లు, గుర్తు, హ్యాచరీ, డెలివరీ, చెల్లించినది, బాకీ
- Telugu font: `'Noto Sans Telugu', 'Gautami', sans-serif`

---

## 6. Telugu Transliteration

| Detail | Value |
|---|---|
| Purpose | Converts Roman script customer data to Telugu script for bilingual labels |
| API | Google Input Tools (`itc=te-t-i0-und`) — free, no API key |
| Fields transliterated | customer_name, village_city, egg_mark |
| Fields NOT transliterated | Numbers, dates (kept as-is) |
| Server-side cache | In-memory `Map`, cleared on restart |
| Client storage | `teluguMap` state in CustomerListPage |
| Fallback | On API failure, returns original text unchanged |
| Endpoint | `POST /api/transliterate` |

---

## 7. Settings Page (`/settings`)

Three configurable defaults:

| Setting | Default | Per-sale override? |
|---|---|---|
| Default Incubation Days | 21 | Yes — each sale can have its own |
| Hatchery Days Before Delivery | 3 | No — global only |
| Default Price per Egg (Rs) | 15 | Yes — each sale can have its own |

- All 3 loaded on mount (separate API calls)
- Single "Save" button — saves all 3 sequentially
- Success message shown for 3 seconds
- Stored in `settings` DB table as key-value pairs

---

## 8. Business Logic (Computed Values)

| Value | Formula | Where computed |
|---|---|---|
| Delivery Date | `date_received + incubation_days` | Client (form preview) + Sequelize virtual field |
| Hatchery Date | `date_received + incubation_days - hatchery_days_before` | Client (list page) + server (hatchery endpoint) |
| Total Amount | `price_per_egg × num_eggs` | Client (form preview) + Sequelize virtual field |
| Balance | `total_amount - amount_paid` | Client (form preview) + Sequelize virtual field |
| Customer ID | `"INC_" + id.padStart(4, '0')` | Sequelize virtual field |
| Daily S.No | 1-based per `date_received` group, sorted by `createdAt` | Client useMemo (from unfiltered list) |
| Overdue | `deliveryDate < today` | Client helper function |

---

## 9. Navigation — Navbar

| Link | Route | Active when |
|---|---|---|
| Syam Incubators (brand) | `/` | — |
| Sales | `/` | `pathname === '/'` |
| New Sale | `/customers/new` | `pathname === '/customers/new'` |
| Hatchery | `/hatchery` | `pathname === '/hatchery'` |
| Settings | `/settings` | `pathname === '/settings'` |
| Logout | — | Clears token → `/login` |

- Hamburger menu on mobile (≤768px) — animates to X when open
- All links close mobile menu on click

---

## 10. Responsive Design

| Breakpoint | Changes |
|---|---|
| ≤1024px | Table hidden, card list shown |
| ≤768px | Hamburger nav, single-column forms, stacked buttons, full-width search |

- 44px minimum touch targets on all interactive elements
- Safe area insets (`env(safe-area-inset-*)`) for notched phones
- `viewport-fit=cover` in `index.html`
- System font stack (no web fonts except Telugu print)

---

## 11. API — Complete Method List

| Method | HTTP | Endpoint | Purpose |
|---|---|---|---|
| `login` | POST | `/api/auth/login` | Authenticate, get JWT |
| `getCustomers` | GET | `/api/customers?search=` | List all / search |
| `getCustomer` | GET | `/api/customers/:id` | Single customer |
| `createCustomer` | POST | `/api/customers` | New sale |
| `updateCustomer` | PUT | `/api/customers/:id` | Edit sale |
| `deleteCustomer` | DELETE | `/api/customers/:id` | Delete sale |
| `getHatcheryList` | GET | `/api/customers/hatchery` | Hatchery transfers list |
| `getIncubationDays` | GET | `/api/settings/incubation-days` | Read setting |
| `updateIncubationDays` | PUT | `/api/settings/incubation-days` | Save setting |
| `getHatcheryDaysBefore` | GET | `/api/settings/hatchery-days-before` | Read setting |
| `updateHatcheryDaysBefore` | PUT | `/api/settings/hatchery-days-before` | Save setting |
| `getPricePerEgg` | GET | `/api/settings/price-per-egg` | Read setting |
| `updatePricePerEgg` | PUT | `/api/settings/price-per-egg` | Save setting |
| `transliterate` | POST | `/api/transliterate` | Roman → Telugu batch |
