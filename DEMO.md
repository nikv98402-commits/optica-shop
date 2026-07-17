# VisionLux demo script

## Goal

Show ViLu as a mobile-ready optical retail demo that combines eyewear selection, online try-on, visit preparation, a non-charging payment contour, and the Vision Hub demo cabinet.

## Public demo URL

https://vilu.store/

Open this URL on iPhone in Safari or Chrome. No laptop or installation is required after GitHub Pages deployment is active.

## Demo route

### 1. Home page

Show:
- premium optical brand positioning;
- hero section;
- featured products;
- Vision Hub subscription block.

Talking point:
VisionLux is not only an online catalog. It is a bridge between online selection, salon fitting and long-term vision care.

### 2. Catalog

Show:
- category filters: all, eyeglasses, sunglasses, contact lenses;
- brand filters;
- fitting counter;
- product cards.

Talking point:
The catalog supports a hybrid retail journey: customers choose online but finish fitting and adjustment in the salon.

### 3. Fitting flow

Show:
- add up to 5 frames to fitting;
- fitting counter in navigation;
- only fitting filter.

Talking point:
The fitting flow is the main conversion mechanic for optical retail because glasses often require offline try-on and adjustment.

### 4. Product detail

Show:
- product image;
- price;
- stock;
- guarantee;
- fitting availability;
- contact lens subscription option.

Talking point:
The product card is already structured for future ERP/stock integration.

### 5. Visit-preparation checkout

Show:
- a shortlist of 1-3 selected frames;
- city, store, or decide-later preference;
- optional name, contact channel/value, and explicit consent;
- the 429 RUB visit-preparation service separated from frame and lens pricing;
- the test-payment return, success, and failure states.

Talking point:
The server owns the 429 RUB offer and creates an idempotent test intent only after a consented lead. No card details are requested and no real charge occurs until YooKassa and verified webhooks are connected.

### 6. Store locator

Show:
- modal with salons;
- search by city or address;
- address, phone and working hours.

Talking point:
This supports the offline conversion path: fitting, pickup, adjustment and eye exam in salon.

### 7. Vision Hub dashboard

Show:
- create demo account;
- client profile;
- prescription fields SPH / CYL / AXIS;
- next exam date;
- eye exercises;
- vision infographic;
- personalized offers.

Talking point:
Vision Hub creates retention: exam reminders, lens subscription, personal prescription data and eye-care routines.

## Demo account

Any email and password with at least 6 characters can be used.
Example:

- Email: demo@visionlux.ru
- Password: demo123

The demo auth is local-browser only and uses localStorage.

## Current limitations

- Checkout accepts 1-3 selected frames but does not sell or reserve frames or lenses.
- Auth and profile data are stored in localStorage.
- Product data comes from `src/data/products.ts`.
- Lead and test payment-intent Edge Functions require configured Supabase variables; Tally remains the rollout fallback.
- YooKassa charging, webhook-confirmed payment, receipts, refunds, and reconciliation are not connected.

## Recommended next corrections

1. Connect the YooKassa test shop and verified idempotent webhook.
2. Complete receipt, refund, reconciliation, monitoring, and restricted-CORS readiness.
3. Replace the demo salon list with confirmed partner locations and availability.
4. Add an operator/admin workflow for consented visit-preparation leads.
5. Add route-level code splitting for the current large JavaScript bundle.
