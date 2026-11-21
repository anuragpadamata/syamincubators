# Syam Incubators — Project Notes

> Running reference for decisions, plans, and implementation progress.
> Updated on 2026-10-31 with the user's Google Sheet and full serverless PWA migration.

---

## Architecture: React PWA + Google Apps Script + Google Sheets

PostgreSQL, Sequelize, and Express.js have been completely removed.
The application now runs as a serverless PWA directly communicating with Google Sheets.

```
Client (Mobile / Desktop Browser or Installed PWA)
      ↓ HTTPS POST (JSON payload)
Google Apps Script Web App (FREE — hosted by Google, apps-script/Code.gs)
      ↓ Reads & writes
Google Sheets (FREE — acts as the shared database)
```

---

## Google Sheets Database Configuration

| Info | Value |
|---|---|
| Spreadsheet URL | https://docs.google.com/spreadsheets/d/1aRUoNQrjJaB280hs_e2Z_kKehYvAe4vY0pj7LrHTDP0/edit |
| Spreadsheet ID | `1aRUoNQrjJaB280hs_e2Z_kKehYvAe4vY0pj7LrHTDP0` |
| Backend Code | `apps-script/Code.gs` |

### Required Sheet Tabs (Auto-created if missing)

**Sheet 1: `customers`**
Header row (row 1):
```text
id | customer_name | num_eggs | village_city | mobile_number | egg_mark | date_received | incubation_days | price_per_egg | amount_paid | created_at
```

**Sheet 2: `settings`**
Header row (row 1): `key | value`
Seed rows (rows 2–4):
```text
default_incubation_days | 21
hatchery_days_before    | 3
default_price_per_egg   | 15
```

---

## Deployment & Setup Guide

### 1. Deploy Google Apps Script
1. Open the Google Spreadsheet: https://docs.google.com/spreadsheets/d/1aRUoNQrjJaB280hs_e2Z_kKehYvAe4vY0pj7LrHTDP0/edit
2. Click **Extensions** → **Apps Script**.
3. Replace all code in `Code.gs` with the contents of `Project/apps-script/Code.gs`.
4. Click **Deploy** → **New deployment**.
5. Select type: **Web app**.
   - **Description:** Syam Incubators API
   - **Execute as:** `Me (your email)`
   - **Who has access:** `Anyone` (Crucial for mobile and web requests)
6. Click **Deploy** and copy the **Web app URL** (`https://script.google.com/macros/s/.../exec`).

### 2. Connect the React Client
* Option A (In Browser/Mobile): On the login page, expand **⚙ Configure Google Apps Script URL**, paste the URL, and log in (`admin` / `admin123`).
* Option B (Environment variable): Create `Project/client/.env` and set:
  ```env
  VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
  ```

### 3. Install on Mobile Phone (PWA)
1. Open the web app URL in Google Chrome (Android) or Safari (iOS).
2. Tap the browser menu (three dots in Chrome or Share button in Safari).
3. Select **Add to Home screen** / **Install app**.
4. The Syam Incubators app will now launch full-screen like a native mobile app.

---

## Status Log

| Date | Milestone |
|---|---|
| 2026-10-31 | Google Sheet ID `1aRUoNQrjJaB280hs_e2Z_kKehYvAe4vY0pj7LrHTDP0` integrated into `apps-script/Code.gs`. |
| 2026-10-31 | Removed `server/`, PostgreSQL credentials, `.env`, Sequelize models, and Express server. |
| 2026-10-31 | Rewrote `client/src/api.js` to communicate directly with Google Apps Script Web App. |
| 2026-10-31 | Added PWA Web Manifest (`manifest.json`), Service Worker (`sw.js`), and registered in `index.html`. |
| 2026-10-31 | Verified production build with `npm run build` (successful). |
