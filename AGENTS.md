# Codex instructions for VisionLux Optica Shop

## Project context

VisionLux Optica Shop is a demo optical retail web app built with React, TypeScript, Vite and Tailwind CSS.
The product is intended for fast demos on desktop and iPhone via GitHub Pages.

## Important product areas

- Home page: brand positioning, hero, featured products, Vision Hub block.
- Catalog: eyeglasses, sunglasses, contact lenses, filters and fitting cart.
- Product detail: price, stock, fitting availability and contact lens subscription choice.
- Checkout: demo order flow, delivery choice and total calculation.
- Store locator: modal with city/address search.
- Dashboard / Vision Hub: demo auth, client profile, prescription, eye exercises, progress metrics and personal offers.

## Commands to run before finishing a code change

```bash
npm install
npm run typecheck
npm run build
npm run lint
```

If only documentation changes were made, typecheck/build are still useful but not mandatory if dependencies are unavailable.
Always mention which checks were run and which were skipped.

## Code style

- Keep components typed with TypeScript.
- Prefer existing Tailwind utility style and rounded premium visual language.
- Keep the app autonomous: it must work without Supabase environment variables.
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
