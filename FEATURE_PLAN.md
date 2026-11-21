# Syam Incubators — Feature Plan (PWA + GitHub Pages + Google Apps Script + Google Sheets)

> Status key: ✅ Keep as-is | 🔄 Needs change | ➕ New | ❌ Remove

---

## Chosen Stack (Decided 2026-10-29)

**React PWA + GitHub Pages + Google Apps Script + Google Sheets**

```
GitHub Pages (FREE static hosting)
  └─ Hosts the React/Vite build (only HTML + JS + CSS files — NO server, NO data)
  └─ User opens URL in Chrome → "Add to Home Screen" → installs as PWA
          ↓ HTTPS API calls
Google Apps Script Web App (FREE — Google hosts it)
  └─ Acts as the entire backend / REST API
          ↓ Reads & writes
Google Sheets (FREE — acts as the database)
  └─ Spreadsheet ID: 1j69QxBZ41zoDipTDa01bm64oeRTikasxzTPSQAq9uYU
```

### Why GitHub Pages is FREE and has NO server/data
- GitHub Pages **only serves static files** (the compiled React app: HTML, JS, CSS)
- It has **no server**, **no database**, **no backend** — it's just file storage
- **All data** lives in Google Sheets — GitHub Pages never touches it
- **Cost: $0** — free for public repositories forever

### PWA vs APK — Why PWA is Better Here
| | PWA (GitHub Pages) | APK (Capacitor) |
|---|---|---|
| Cost | Free | Free |
| Install method | Chrome → "Add to Home Screen" | Download .apk → install |
| Security warning | None | "Install from unknown sources" warning |
| Updates | Auto — push to GitHub, everyone gets it | Manual — rebuild + redistribute APK |
| Works on iPhone | Yes | No (APK is Android only) |
| Build complexity | Simple (`npm run build` + push) | Requires Android Studio |
| Looks native | Yes (fullscreen, own icon) | Yes |
| Offline support | Yes (with service worker) | Yes (with Capacitor) |

---

## Migration Summary

| Layer | Current | New |
|---|---|---|
| App delivery | Browser (localhost:5173) | PWA installed from Chrome |
| Hosting | None (local only) | GitHub Pages (free, static only) |
| Backend | Express.js server | Google Apps Script (free) |
| Database | PostgreSQL + Sequelize | Google Sheets |
| Auth | JWT (7-day token) | Password-based (password = token) |
| Updates | Manual restart | Push to GitHub → instant for all users |

---

## Feature Status: What Changes, What Stays

### 1. Authentication
| Feature | Status | Notes |
|---|---|---|
| Login form (username + password) | ✅ Keep | No UI change needed |
| Single admin user | ✅ Keep | Password stored in Apps Script code |
| Token stored in localStorage | 🔄 Change | Password stored as token (not JWT) |
| Auto-logout on 401 | ✅ Keep | Same behavior in new `api.js` |
| Protected routes | ✅ Keep | No change in `ProtectedRoute.jsx` |
| JWT signing/verification | ❌ Remove | Replaced by simple password check |

### 2. Sales Page
| Feature | Status | Notes |
|---|---|---|
| View all sales (table + cards) | ✅ Keep | No change |
| Search by name/village/mobile | ✅ Keep | No change |
| Date filters (6 modes) | ✅ Keep | No change |
| Sorting (newest/oldest) | ✅ Keep | No change |
| Collapse/expand cards | ✅ Keep | No change |
| Expand All / Collapse All | ✅ Keep | No change |
| Daily S.No | ✅ Keep | No change |
| Overdue highlighting | ✅ Keep | No change |
| Balance color coding | ✅ Keep | No change |
| Delete with confirmation | ✅ Keep | No change |
| Print button + dialog | ✅ Keep | No change |

### 3. New Sale / Edit Sale
| Feature | Status | Notes |
|---|---|---|
| All 9 form fields | ✅ Keep | No change |
| Autocomplete (all 3 fields) | ✅ Keep | No change |
| Live billing preview | ✅ Keep | No change |
| Live delivery date preview | ✅ Keep | No change |
| New mode / Edit mode | ✅ Keep | No change |

### 4. Hatchery Page
| Feature | Status | Notes |
|---|---|---|
| Today's transfers | ✅ Keep | No change |
| Date picker | ✅ Keep | No change |
| Upcoming 7 days | ✅ Keep | No change |
| Hatchery date computation | ✅ Keep | Computed in Apps Script |

### 5. Print System
| Feature | Status | Notes |
|---|---|---|
| Single Page print | ✅ Keep | No change |
| Separate Pages print | ✅ Keep | No change |
| Day Print Labels (English) | ✅ Keep | No change |
| Day Print Telugu (bilingual duplex) | ✅ Keep | Transliteration via Apps Script |

### 6. Telugu Transliteration
| Feature | Status | Notes |
|---|---|---|
| Google Input Tools API call | 🔄 Change | Called from Apps Script instead of Express |
| Server-side cache | ✅ Keep | Cache in Apps Script (PropertiesService or in-memory) |
| Client `teluguMap` state | ✅ Keep | No change |
| Bilingual duplex layout | ✅ Keep | No change |

### 7. Settings Page
| Feature | Status | Notes |
|---|---|---|
| 3 configurable settings | ✅ Keep | Stored in Google Sheets `settings` tab |
| Load on mount | ✅ Keep | Single `getSettings` call instead of 3 |
| Save all on button click | ✅ Keep | No change |

### 8. Navigation & Layout
| Feature | Status | Notes |
|---|---|---|
| Navbar with hamburger menu | ✅ Keep | No change |
| All 5 routes | ✅ Keep | No change |
| Responsive design | ✅ Keep | No change |
| Mobile touch targets | ✅ Keep | No change |

---

## What Actually Changes in Code

### New: `client/public/manifest.json` — PWA Manifest
Makes the app installable as a PWA:
```json
{
  "name": "Syam Incubators",
  "short_name": "Syam Inc",
  "start_url": "/syam-incubators/",
  "display": "standalone",
  "background_color": "#f8fafc",
  "theme_color": "#2563eb",
  "icons": [{ "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
            { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }]
}
```

### New: `client/public/sw.js` — Service Worker (optional but recommended)
Caches the app shell so it loads even with slow/no internet.

### New: `client/index.html` — Add manifest link
Add `<link rel="manifest" href="/manifest.json">` and `<meta name="theme-color" content="#2563eb">`

### `client/vite.config.js` — Add base path for GitHub Pages
GitHub Pages serves from `https://<user>.github.io/<repo>/` so Vite needs:
```js
base: '/syam-incubators/',   // must match your GitHub repo name
```

### New: `.github/workflows/deploy.yml` — GitHub Actions auto-deploy
On every push to `main` → runs `npm run build` → deploys `dist/` to GitHub Pages automatically.

### `client/src/api.js` — Complete Rewrite
Old: calls `http://localhost:3000/api/...` via Vite proxy
New: calls Google Apps Script Web App URL with `{ action, password, ...data }`

```
Old method signatures → New action names
─────────────────────────────────────────
login(username, password)          → action: 'login'
getCustomers(search)               → action: 'getCustomers', search
getCustomer(id)                    → action: 'getCustomers' then filter client-side by id
createCustomer(data)               → action: 'createCustomer', data
updateCustomer(id, data)           → action: 'updateCustomer', id, data
deleteCustomer(id)                 → action: 'deleteCustomer', id
getHatcheryList()                  → action: 'getHatchery'
getIncubationDays()                → action: 'getSettings' then extract key
updateIncubationDays(value)        → action: 'updateSettings', key, value
getHatcheryDaysBefore()            → action: 'getSettings' then extract key
updateHatcheryDaysBefore(value)    → action: 'updateSettings', key, value
getPricePerEgg()                   → action: 'getSettings' then extract key
updatePricePerEgg(value)           → action: 'updateSettings', key, value
transliterate(texts)               → action: 'transliterate', texts
```

### `client/vite.config.js` — Remove proxy
Remove the `/api → localhost:3000` proxy (not needed for production or Capacitor).

### `client/package.json` — Add Capacitor
Add: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`

### New: `capacitor.config.json` — Capacitor config
Created by `npx cap init`. Sets app name, app ID, web dir.

### New: `android/` folder — Android project
Created by `npx cap add android`. Contains the full Android Studio project.

### New: `apps-script/Code.gs` — The entire backend
Complete Google Apps Script code replacing Express + PostgreSQL.

### Unchanged (no edits needed):
- `client/src/pages/` — all 5 pages
- `client/src/components/` — Navbar, ProtectedRoute
- `client/src/context/AuthContext.jsx`
- `client/src/App.jsx`
- `client/src/index.css`
- `client/index.html`

---

## New File: `apps-script/Code.gs`

Full backend to be written. Handles:

```
doPost(e) routes:
  login              → validate password → return { token: password }
  getCustomers       → read customers sheet → filter/sort → return array
  getHatchery        → read customers → compute hatcheryDate → return array
  createCustomer     → generate id (Date.now()) → append row → return customer
  updateCustomer     → find row by id → update cells → return customer
  deleteCustomer     → find row by id → delete row → return { message }
  getSettings        → read settings sheet → return { key: value, ... } map
  updateSettings     → find row by key → update value (or append if new)
  transliterate      → call Google Input Tools for each text → return results map
```

Virtual fields computed before returning (same formulas as current Sequelize):
- `customerId` = `"INC_" + id.toString().padStart(4, '0')`
- `deliveryDate` = `date_received + incubation_days` days
- `total_amount` = `price_per_egg × num_eggs`
- `balance` = `total_amount - amount_paid`
- `hatcheryDate` = `date_received + incubation_days - hatchery_days_before` days

---

## Google Sheets Structure

### Tab: `customers`
Row 1 = headers (never changes):
```
id | customer_name | num_eggs | village_city | mobile_number | egg_mark | date_received | incubation_days | price_per_egg | amount_paid | created_at
```
Row 2+ = data

### Tab: `settings`
Row 1 = headers:
```
key | value
```
Rows 2–4 = seed data:
```
default_incubation_days | 21
hatchery_days_before    | 3
default_price_per_egg   | 15
```

---

## Implementation Order

1. **Set up Google Sheet tabs** — add `customers` + `settings` tabs with headers (manual)
2. **Write + deploy Google Apps Script** — paste code, deploy as Web App, copy URL
3. **Rewrite `client/src/api.js`** — point at Apps Script URL
4. **Test in browser** — run `npm run dev`, verify all features work
5. **Add PWA manifest + icons** — `manifest.json`, 192px + 512px icons
6. **Configure Vite base path** — set `base: '/syam-incubators/'` in `vite.config.js`
7. **Create GitHub repo** — push the code
8. **Enable GitHub Pages** — set source to GitHub Actions
9. **Add deploy workflow** — `.github/workflows/deploy.yml`
10. **Push + verify** — open `https://<user>.github.io/syam-incubators/` in Chrome
11. **Install PWA** — Chrome menu → "Add to Home Screen" on the phone

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Apps Script cold start delay (~1-2s first request) | Slow first load | Acceptable for a shop app |
| 90 min/day quota | Could hit limit if very busy | More than enough for a small shop; upgrade to Workspace if needed |
| No offline support | App needs internet | Shop has wifi/mobile data |
| Concurrent writes | Two phones write at same time | Low risk for small shop; Apps Script handles sequentially |
| Apps Script URL changes on redeploy | All APKs stop working | Never delete the deployment — always redeploy same ID |

---

## Future Features (Post-Migration, Nice to Have)

- [ ] Offline mode (cache last data in localStorage, sync when online)
- [ ] Export to PDF / WhatsApp share
- [ ] Customer payment history (multiple payments per sale)
- [ ] Push notifications when hatchery transfer day arrives
- [ ] Dark mode
- [ ] Backup / restore from Sheets
- [ ] Search by date range across multiple months report
