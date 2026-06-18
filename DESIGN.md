# Design System - ViLu

## Product Context

- **What this is:** ViLu is a consumer eyewear try-on and knowledge product. It helps a user upload a photo, evaluate frame fit, save 2-3 frame options, and move to a nearby optical salon with a clear visit checklist.
- **Who it is for:** People choosing glasses before an in-store fitting, plus optical partners who need higher-intent visitors rather than anonymous map traffic.
- **Space/industry:** Online eyewear try-on, optical retail, local salon discovery, and educational eyewear guidance.
- **Project type:** Hybrid consumer web app: product-led landing page, try-on tool, catalog, local store locator, demo profile, and knowledge base.

## Strategic Positioning

ViLu should not look like another glasses catalog. The design should make the product's wedge obvious:

> Face-fit score plus visit preparation: choose fewer frames online, then visit a salon with better intent.

Reference landscape:

- Warby Parker and similar brands prove that try-on reduces uncertainty, but they lean heavily into retail brand experience.
- Zenni and large online catalogs win on selection and price, but can feel transactional and crowded.
- LensCrafters and traditional optical retailers win on trust and physical service, but the online experience often starts with locations or products rather than personalized preparation.
- ViLu's differentiator is the bridge: online selection followed by nearby salon action.

## Aesthetic Direction

- **Direction:** Methodical premium utility.
- **Decoration level:** Intentional, low decoration. Use product state, selection steps, checklists, and frame imagery instead of abstract ornaments.
- **Mood:** Calm, expert, helpful, slightly premium. The user should feel that ViLu is guiding a practical choice, not pushing a medical claim or a fashion mood board.
- **Avoid:** Poster-like oversized type, decorative circles, purple gradients, generic stock-photo heroes, internal analytics language, and UI that asks for contact before value is clear.

## Typography

- **Display/Hero:** Unbounded - keep for brand character and strong Cyrillic presence, but use it sparingly.
- **Body:** Manrope - clean, readable, familiar enough for forms and explanations.
- **UI/Labels:** Manrope for most labels; Unbounded only for short brand/section accents.
- **Data/Tables:** IBM Plex Mono or JetBrains Mono where tabular alignment matters. Use `font-variant-numeric: tabular-nums`.
- **Code:** JetBrains Mono.
- **Loading:** Current app uses Google-hosted `Unbounded` and `Manrope`; keep until performance requires self-hosting.

Typography rules:

- No negative letter spacing on Cyrillic headings.
- Hero H1 should usually max at `text-6xl` on desktop for product pages.
- Use `leading-[1.04]` to `leading-[1.12]` for large display text.
- Avoid all-caps for long commands. Use all-caps only for small section labels and short buttons.
- Inside cards, modals, sidebars, and dashboards, headings should stay compact: `text-xl` to `text-3xl`.

## Color

### Approach

Balanced warm-neutral base with a clinical green anchor and amber action color. The palette should feel warmer than a medical portal but calmer than a fashion marketplace.

### Core Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `vilu-ink` | `#08101f` | Primary text, dark buttons |
| `vilu-paper` | `#fffaf2` | Main warm page background |
| `vilu-cream` | `#f7f1e8` | Hero and soft section background |
| `vilu-mist` | `#eef5f1` | Trust blocks, privacy notices, selected states |
| `vilu-green` | `#315c56` | Primary brand anchor, selected state, trust |
| `vilu-amber` | `#f5b25f` | Main action color, highlights |
| `vilu-clay` | `#9a6933` | Section eyebrow text |
| `vilu-line` | `#e8dfd2` | Borders on warm surfaces |

### Semantic

| Token | Hex | Usage |
| --- | --- | --- |
| Success | `#15803d` | Saved state, open status |
| Warning | `#92400e` | Fit caveats, salon availability caveats |
| Error | `#b91c1c` | Form errors |
| Info | `#1d4ed8` | Privacy/data notices |

Color rules:

- Do not let the site become all beige. Every warm section needs either a white product surface, green anchor, or slate text structure.
- Use amber for actions, not decoration.
- Use green for trust, partner status, selection, and verified product states.
- Avoid purple/violet gradients.
- Dark sections should be rare and purposeful: checklist summary, visit readiness, or profile analytics.

## Spacing

- **Base unit:** 8px.
- **Density:** Comfortable on landing/knowledge pages, compact on tools and salon cards.
- **Scale:** `2xs 4`, `xs 8`, `sm 12`, `md 16`, `lg 24`, `xl 32`, `2xl 48`, `3xl 64`.

Spacing rules:

- Tool screens should prioritize scan speed over editorial whitespace.
- Use 24-32px padding for cards on desktop, 16-24px on mobile.
- Sticky sidebars should avoid giant vertical gaps; keep actions visible without scrolling.
- Hero sections must reveal a hint of the next section on common desktop and mobile viewports.

## Layout

- **Approach:** Product-led hybrid layout.
- **Grid:** Two-column hero where the second column shows actual product state or a realistic try-on/selection artifact, not generic atmosphere.
- **Max content width:** `max-w-7xl` for product surfaces; knowledge pages can use `max-w-6xl`.
- **Cards:** Use cards for repeated items, modals, tools, and framed interactions. Do not nest cards inside cards.
- **Border radius:** Use hierarchy:
  - Small controls: 12px
  - Inputs and small cards: 16px
  - Product/salon cards: 20-24px
  - Modals/tools: 24-32px
  - Pills: 9999px

Layout rules:

- The first screen should answer: what do I do, why do I trust it, what happens after selection?
- Nearby optics should appear after the selection value is clear.
- Do not expose internal product terms like "intent signals", "lead", "Tally", or analytics language in user UI.
- Every data-collection step needs a no-contact or local-only path when possible.

## Components

### Primary CTA

- Shape: pill.
- Color: `vilu-ink` or `vilu-amber` depending on context.
- Copy: action-first, user language.
- Good: `Начать подбор`, `Сохранить в подбор`, `Скопировать без контакта`.
- Avoid: `Submit lead`, `Visit lead`, `Tally`, `Отправить данные`.

### Trust Notices

Use compact notices near the relevant action, not a large legal block.

Examples:

- `Фото используется только в вашем браузере и не отправляется на сервер.`
- `Контакт передается только после согласия.`
- `Рецепт и параметры зрения не заменяют консультацию специалиста.`

### Visit Preparation Modal

Required hierarchy:

1. Selected frames.
2. Safe no-contact option.
3. Optional contact form.
4. Consent copy.
5. Clear status after action.

### Dashboard

The dashboard is demo/local until the legal and backend model is ready.

- Use `demo-кабинет`, not regular registration language.
- Use `Персональное предложение`, not `Реклама`.
- Never imply reminders are actually sent unless the backend exists.
- Analytics events must not include PII, prescription data, complaints, or contact details.

## Motion

- **Approach:** Minimal functional motion.
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` for common UI transitions.
- **Duration:** 120-200ms for hover/focus; 200-300ms for modal entry.
- **Avoid:** Large parallax, decorative animated blobs, and motion that competes with try-on controls.

## Imagery

- Prefer real frame/product imagery and UI-state imagery.
- Hero images should support the product journey: try-on, selected frames, checklist, or salon visit.
- Avoid generic lifestyle stock photos as the primary proof of value.
- Frame thumbnails must remain inspection-friendly: centered, high contrast, stable aspect ratio.

## Accessibility And Responsive Rules

- Buttons must remain readable at 320px width.
- Text inside buttons should not overflow; use shorter copy before reducing font size.
- Every icon-only control needs an accessible label or title.
- Focus states should be visible on inputs, buttons, and modal controls.
- Mobile priority order: CTA, photo upload, frame selection, saved checklist, salons.

## Content Voice

- Calm, practical, expert.
- Explain limitations clearly without killing momentum.
- Prefer "предварительно", "помогает выбрать", "проверить в салоне" over "точно определяет" or "подходит на 100%".
- Use one repeated memory phrase:

> ViLu помогает выбрать 2-3 оправы для очной примерки с помощью онлайн-примерки и предварительного Face-fit score.

## Decisions Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-06-18 | Adopted "methodical premium utility" direction | ViLu needs to differentiate from catalogs and maps by owning the selection-to-salon journey. |
| 2026-06-18 | Keep Unbounded + Manrope but remove negative tracking | Preserves brand character while improving Cyrillic readability and professional polish. |
| 2026-06-18 | Keep warm-neutral palette with green/amber anchors | Matches current product identity while reducing beige-heavy drift. |
| 2026-06-18 | Require user-language copy for visit flow | Prevents internal implementation words from leaking into the customer experience. |

## Implementation Checklist

- Read this file before visual changes.
- Check new UI against product path: `подбор -> score -> сохранение -> салоны -> маршрут/контакт`.
- Keep privacy/local-mode notices near data collection.
- Run `npm run lint` and `npm run build` after UI changes.
- When a new page is added, define its role in this design system before styling it.
