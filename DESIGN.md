# Design System - ViLu

## Optical Orbits v5 — Active Direction

Approved on 2026-07-23. This section supersedes older rules below where they conflict.

- **Core idea:** ViLu turns uncertainty into a clear next step. The visual language combines calm optical fields, precise grids, restrained lime signals, and conversational guidance.
- **Primary type:** Manrope for product UI and large Cyrillic headings. Unbounded remains a legacy brand accent only and should not be introduced into new large content surfaces.
- **Signature motion:** `AtomicHeading` softly disassembles and reassembles major narrative headings while they are visible. `OpticalOrbits` expresses guidance and focus around high-value interactive surfaces.
- **Motion density:** expressive in the home hero, functional in try-on, restrained in catalog and knowledge content. Never place more than two continuously moving focal objects in one viewport.
- **AI surface:** one dominant composer, compact suggestions, visible loading/retrieval state, concise answer, citations beside the answer, and a direct path to the full assistant.
- **Surface palette:** exactly two page surfaces: Optical Black `#03110c` and warm paper `#f8f3e8`. Signal lime `#d7f53d` is an accent only. Trust green may appear in text/icons/status, never as a page or section background. Foam, mint, and pistachio backgrounds are deprecated.
- **Card contract:** every functional box has a visible 1px border, a shared 28px radius, and a consistent 24-32px desktop / 16-24px mobile inset. Borderless containers are allowed only for editorial copy, never for controls, tools, results, maps, or assistant surfaces.
- **Hero contract:** product heroes use the Mission-page full-bleed dark field and a common viewport-aware minimum height. Dense secondary explanations progressively collapse on small screens instead of stretching the first screen.
- **Accessibility:** all continuous motion must stop with `prefers-reduced-motion`; animated headings keep screen-reader text; orbit layers never accept pointer events.
- **Rollout:** the home page establishes the system. Catalog, product, try-on, salon, dashboard, knowledge pages, and `/assistant` should migrate incrementally using shared tokens rather than page-specific reinterpretations.

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
- **Decoration level:** Intentional optical motion. Use product state, selection steps, checklists, frame imagery, and the shared Optical Orbits language; avoid unrelated ornament.
- **Mood:** Calm, expert, helpful, slightly premium. The user should feel that ViLu is guiding a practical choice, not pushing a medical claim or a fashion mood board.
- **Avoid:** Poster-like oversized type without interaction, arbitrary circles, purple gradients, generic stock-photo heroes, internal analytics language, and UI that asks for contact before value is clear.

## Typography

- **Display/Hero:** Manrope for new Optical Orbits headings and animated Cyrillic. Unbounded is retained only for legacy accents during migration.
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

### Fit-Ready Try-On Layer

The fit-ready layer is a calm fitting assistant, not a technical dashboard. It should help the user answer one question:

> Can I take this frame to a store visit, and what should I check there?

Required hierarchy on `/tryon`:

1. Live try-on image and active frame.
2. Placement controls.
3. Primary action: `Оценить посадку`.
4. Fit confidence result.
5. Store visit checklist.
6. Collapsible frame passport.
7. Collapsible 3D readiness details.

Do not show 3D model status, raw confidence, landmarks, or asset paths above the try-on canvas.

#### Auto-Fit UI

Use customer language:

- Good: `Автопосадка оправы`, `Автопосадка готова`, `Качество фото: хорошее`.
- Avoid: `MediaPipe`, `Face Landmarker`, `confidence`, `scaleVerified=false`, raw landmark terms.

Landmarks are hidden by default. If shown, the toggle copy is `Показать ориентиры`, and the state must be clearly secondary.

Photo quality labels:

| State | Label | Tone |
| --- | --- | --- |
| Good | `Качество фото: хорошее` | green trust |
| Medium | `Качество фото: среднее` | neutral or soft amber |
| Poor | `Лучше переснять фото` | soft warning, not red |
| Unsupported | `Нужен JPEG, PNG или WebP` | clear helper text |

#### Fit Confidence Card

This is the first visible result after evaluation. It should be compact, calm, and action-oriented.

Required structure:

1. `Подходит для первого визита: X/100`.
2. Confidence badge: `Высокая уверенность`, `Средняя уверенность`, or `Нужна очная проверка`.
3. `Что выглядит хорошо`.
4. `Что проверить в салоне`.
5. Disclaimer: `Оценка предварительная и не заменяет финальную посадку в салоне.`

Forbidden:

- `точно подходит`
- `1:1 посадка`
- `измерили PD`
- `медицинская точность`

#### Frame Passport

The passport is evidence, not the main experience. Default state is compact.

Compact state:

`Данные оправы · 49-19-140 · ацетат · посадка A`

Expanded state:

- Dimensions.
- Bridge type.
- RX caution.
- What can be assessed online.
- What must be checked in store.

Keep dense numeric data in tables or definition rows. Do not put long explanations in narrow cards.

#### 3D Readiness

The first release is fallback-only. Missing GLB is a normal MVP state.

Default copy:

`3D-модель готовится. Сейчас оценка строится по паспорту оправы и фото-примерке.`

Use neutral surfaces. Do not use red, error icons, or alarming copy for missing models.

#### Mobile Fit-Ready Rules

- One-column layout.
- Try-on canvas first.
- Result card below the canvas.
- Technical panels collapsed by default.
- No text block narrower than 260px.
- Buttons use fixed height of 44-52px.
- Button labels must fit at 320px viewport.
- Sliders must not resize their parent containers.
- Avoid side panels with long Russian copy on mobile.

## Motion

- **Approach:** Purposeful optical motion with strict density control.
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` for narrative assembly; `cubic-bezier(0.4, 0, 0.2, 1)` for controls.
- **Duration:** 120-200ms for hover/focus; 200-300ms for modal entry.
- **Signature:** visible-section `AtomicHeading` cycles around every 5.9 seconds; orbit durations vary from 13 to 23 seconds.
- **Avoid:** Large parallax, unrelated animated blobs, simultaneous motion in many sections, and motion that competes with try-on controls.

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
| 2026-06-23 | Added fit-ready try-on layer rules | Prevents the new 3D/passport/score feature from becoming a debug-like technical panel. |

## Implementation Checklist

- Read this file before visual changes.
- Check new UI against product path: `подбор -> score -> сохранение -> салоны -> маршрут/контакт`.
- Keep privacy/local-mode notices near data collection.
- For fit-ready UI, keep 3D/passport details secondary and collapsed until needed.
- Check `/tryon` at 320px and 390px before merging any fit-ready UI.
- Run `npm run lint` and `npm run build` after UI changes.
- When a new page is added, define its role in this design system before styling it.
