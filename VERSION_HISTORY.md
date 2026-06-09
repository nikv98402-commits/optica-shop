# VisionLux Optica Shop Version History

## v-mobile-tryon-overflow-fix

Commit: `c10b6ed`  
Branch: `main`, `codex/fix-mobile-tryon-overflow`  
Tag: `v-mobile-tryon-overflow-fix`

What changed:
- Fixed the iPhone launch blocker in the online try-on section where a white empty strip appeared on the right side of the viewport.
- Added horizontal overflow protection at the `html`, `body`, and `#root` levels.
- Made the Try-On Pilot hero safer on mobile: smaller mobile heading, natural line breaks, tighter mobile padding.
- Added `min-w-0` and responsive constraints to try-on grids, cards, CTA areas, catalog, and lead form so they cannot stretch the viewport.
- Kept existing MVP behavior unchanged: photo upload, frame selection, Face-fit score, lead form, localStorage persistence, and CSV export.

## v-geo-source-pack

Commit: `2cfc45c`  
Branch: `codex/geo-source-pack`  
Tag: `v-geo-source-pack`

What changed:
- Created a new copy branch on top of `v-mobile-tryon-overflow-fix`.
- Added GEO/AI source pack on top of the MVP instead of replacing the try-on flow.
- Added crawlable static HTML source pages:
  - `/face-fit-score/`
  - `/kak-vybrat-razmer-opravy/`
  - `/pd-i-oprava/`
  - `/primerit-ochki-online/`
  - `/oprava-pri-vysokih-dioptriyah/`
  - `/ai-source/`
- Each source page includes `title`, `meta description`, canonical URL, H1/H2, visible explanatory text, internal links, CTA into the MVP try-on flow, and JSON-LD where appropriate.
- Added `public/geo-source.css` for lightweight static source-page styling.
- Added `public/robots.txt`:
  - allows `OAI-SearchBot`;
  - allows `PerplexityBot` and `Perplexity-User`;
  - disallows `GPTBot`;
  - allows ordinary crawlers;
  - points to the sitemap.
- Added `public/sitemap.xml` with the homepage and all source pages.
- Added experimental `public/llms.txt` with an AI-readable project summary, key URLs, and limitations.
- Added a React query bridge so `/optica-shop/?page=tryon` opens the online try-on directly from source-page CTAs.

What did not change:
- The existing MVP try-on, Face-fit score, lead form, localStorage, CSV export, and pilot flow remain unchanged.
- This version is currently a separate GitHub branch for review. It is not merged to `main` until release approval.

Possible next version:
- Add a GEO block for nearby opticians.
- Track the funnel from `source visit` to `try-on started`, `photo uploaded`, `score viewed`, and `lead submitted`.
