# Codex instructions for VisionLux Optica Shop

## Project context

VisionLux Optica Shop is a demo optical retail web app built with React, TypeScript, Vite and Tailwind CSS.
The product is intended for fast demos on desktop and iPhone via GitHub Pages.

## Important product areas

- Home page: brand positioning, hero, featured products, Vision Hub block.
- Catalog: eyeglasses, sunglasses, contact lenses, filters and fitting cart.
- Product detail: price, stock, fitting availability and contact lens subscription choice.
- Checkout: unified 1-3-frame visit-preparation flow with store preference, consented lead submission, and a server-priced 429 RUB test payment contour.
- Store locator: modal with city/address search.
- Dashboard / Vision Hub: legacy demo profile, prescription, eye exercises, progress metrics and personal offers.
- ViLu Slice 0: Supabase Auth plus organization-scoped employee, employer and clinical-partner shells behind strict RU/EN routes, RLS and disabled-by-default feature flags.
- ViLu Slice 1: Guided Optical employee Today, Screening Result and Referral screens, with reload-safe drafts and employee-owned care data behind the Slice 0 organization boundary.
- ViLu Slice 2: organization-scoped Vision Passport and Profile screens with clinic documents, provider consent, export, and a durable server-side data-deletion queue.

## Commands to run before finishing a code change

```bash
npm install
npm run typecheck
npm run build
npm run lint
npm test
npm run test:checkout
npm run test:rls
npm run test:e2e
```

If only documentation changes were made, typecheck/build are still useful but not mandatory if dependencies are unavailable.
Always mention which checks were run and which were skipped.

## Code style

- Keep components typed with TypeScript.
- Prefer existing Tailwind utility style and rounded premium visual language.
- Keep the legacy storefront autonomous: it must work without Supabase environment variables. Slice 0 organization routes fail closed when Supabase or their rollout flags are unavailable.
- Keep `activeOrganizationId`, the accepted membership role and organization feature checks bound to the same route organization.
- Keep every screening and referral query/RPC bound to that same `activeOrganizationId` and the authenticated employee. Preserve optimistic version checks for drafts and atomic idempotency for referral creation.
- Keep Passport/Profile reads and mutations bound to that same organization. Employers receive aggregates only; providers need an active consent grant. Data deletion must remain server-dispatched, storage-first, retryable, and observable.
- Do not remove demo data from `src/data/products.ts` unless a real API replacement is added.
- Keep iPhone/Safari usability in mind: responsive layouts, readable button sizes, no desktop-only critical flows.

## Design system

- Always read `DESIGN.md` before making visual or UI decisions.
- ViLu should feel like methodical premium utility: calm, expert, product-led, and privacy-aware.
- Keep the main user path visible: online try-on -> Face-fit score -> save 2-3 frames -> nearby optics -> route/contact/checklist.
- Avoid internal implementation language in the UI: do not show words like "lead", "Tally", or "intent signals" to users.
- Do not use negative letter spacing on Cyrillic headings.
- For data collection surfaces, preserve local/demo/privacy notices and do not send PII or prescription data to analytics.

## Deployment

The app is configured for GitHub Pages and a custom domain.
The public production URL is:

https://vilu.store/

The workflow file is `.github/workflows/deploy-pages.yml`.
