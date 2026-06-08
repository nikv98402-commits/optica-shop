# VisionLux demo script

## Goal

Show VisionLux as a mobile-ready optical retail demo that combines eyewear catalog, fitting flow, demo checkout and Vision Hub client cabinet.

## Public demo URL

https://nikv98402-commits.github.io/optica-shop/

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

### 5. Demo checkout

Show:
- name and phone fields;
- pickup / courier delivery;
- order summary;
- demo payment confirmation.

Talking point:
The current checkout is intentionally demo-only. It validates the user journey before payment integration.

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

- Checkout uses a fixed demo product in the order summary.
- Auth and profile data are stored in localStorage.
- Product data comes from `src/data/products.ts`.
- Supabase files are present but real backend integration is not enabled.
- Payment integration is not connected.

## Recommended next corrections

1. Make checkout accept the selected product instead of fixed `Aurora Crystal`.
2. Add real cart / fitting summary page.
3. Replace demo salon list with actual company cities and salons.
4. Adapt visual identity from VisionLux to the target retail brand if needed.
5. Add face scan / virtual try-on block as the main WOW feature.
6. Connect order lead submission to CRM or backend.
7. Add mobile QA checklist for iPhone Safari.
