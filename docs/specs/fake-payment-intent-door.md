# Fake payment intent door for visit preparation

## Context

ViLu уже проверяет основной CJM: пользователь примеряет оправы, получает Face-fit score, сохраняет 1-3 модели и открывает оптики рядом. Следующий продуктовый вопрос: готов ли пользователь платить не за "очки онлайн", а за сервисную подготовку визита в салон.

Для первого MVP нельзя подключать настоящие платежи без юридической, бухгалтерской и операционной готовности. Поэтому нужна fake door: пользователь видит понятный сервисный оффер, нажимает "Оплатить", но деньги не списываются, а ViLu фиксирует только обезличенный сигнал намерения.

## Product decision

Первым платным оффером должен быть сервис:

**Приоритетная подготовка визита — 290 ₽**

Смысл для пользователя:

1. Консультант заранее получает короткий список 2-3 оправ.
2. В салоне готовят похожие модели до визита.
3. Пользователь приходит не "просто посмотреть", а с чеклистом по посадке, мосту и ширине оправы.

Почему не берем оплату в первую очередь за очки:

1. Текущий продукт еще не гарантирует наличие конкретной оправы в салоне.
2. Финальная посадка, рецепт, линзы и комфорт требуют очной проверки.
3. Сервис подготовки визита лучше соответствует текущему intent-сигналу: "я уже выбрал и хочу быстрее пройти салон".

## Current State

Проверено 2026-07-12 в ветке `codex/fake-payment-intent-door`.

| Component | Current behavior | File |
|---|---|---|
| Try-on flow | Хранит intent-события локально и отправляет обезличенные события в Метрику | `src/pages/TryOnPilot.tsx` |
| Visit lead | Открывает форму подготовки визита только после 2 сохраненных оправ и согласия | `src/pages/TryOnPilot.tsx` |
| Fake payment offer | Добавлен оффер `Приоритетная подготовка визита` за 290 ₽ | `src/pages/TryOnPilot.tsx:59` |
| Local fake payment count | Сохраняет счетчик кликов в `localStorage` под ключом `vilu_payment_intent_stats` | `src/pages/TryOnPilot.tsx:57` |
| Analytics events | Добавлены `payment_door_viewed`, `payment_intent_clicked`, `payment_door_dismissed` | `src/lib/analyticsEvents.ts:46` |
| RU/EN copy | Добавлены переводы для оффера, модалки и кнопок | `src/components/LanguageDomBridge.tsx:323` |

## Proposed Behavior

### Entry point

Fake payment door показывается в правом блоке "Чеклист для визита" на странице `/tryon`.

Rules:

1. Если нет ни одной сохраненной оправы, кнопка оплаты disabled.
2. Если сохранена хотя бы одна оправа, пользователь может открыть payment door.
3. Для полноценной заявки к визиту по-прежнему нужно минимум 2 оправы и отдельное согласие.

### Offer card

Text:

```text
Платный сервис
Приоритетная подготовка визита
Консультант заранее получает ваш короткий список, готовит похожие оправы и экономит время визита.
Тест · 290 ₽
Проверить готовность платить
```

### Fake payment modal

Text:

```text
Оплата скоро
Приоритетная подготовка визита
Это фейк-дверь для проверки спроса: платежная интеграция пока не подключена, деньги не списываются.

Цена: 290 ₽
Подбор: N
Данные: без фото и рецепта

Что входит в сервис:
1. Проверка короткого списка 2-3 оправ перед визитом.
2. Подготовка похожих моделей консультантом.
3. Чеклист вопросов по посадке, мосту и ширине оправы.

Оплатить 290 ₽
Не сейчас
```

After click on `Оплатить 290 ₽`:

```text
Платежи пока не подключены. Мы зафиксировали интерес к сервису и не списали деньги.
```

## Data Model

### Local storage

Key:

```ts
const PAYMENT_INTENT_KEY = 'vilu_payment_intent_stats';
```

Shape:

```ts
type PaymentIntentStats = {
  count: number;
  lastClickedAt: string;
  offerId: 'visit-prep-priority';
};
```

Retention:

1. Stored only in the browser.
2. Not synced to server.
3. Can be cleared with browser storage.

### Analytics Events

Allowed event payloads:

```ts
type PaymentDoorViewedParams = {
  offer_id: 'visit-prep-priority';
  price: 290;
  selected_count: number;
  source: 'selection_card' | string;
};

type PaymentIntentClickedParams = {
  offer_id: 'visit-prep-priority';
  price: 290;
  selected_count: number;
  intent_clicks: number;
  source: 'fake_payment_modal';
};

type PaymentDoorDismissedParams = {
  offer_id: 'visit-prep-priority';
  selected_count: number;
};
```

Forbidden event payloads:

1. Name
2. Phone
3. Email
4. Telegram / WhatsApp handle
5. Prescription
6. SPH / CYL / AXIS
7. Complaints
8. Photo data
9. Exact geolocation
10. Card data or payment details

## Trust Boundaries

| Boundary | Rule |
|---|---|
| Payment | No real payment provider, no bank card fields, no invoice, no payment token |
| Personal data | Payment intent event must not contain contact, name, email, prescription, symptoms, or photo |
| Health context | The offer is visit preparation only, not medical advice or diagnosis |
| Store promise | Do not promise exact frame availability |
| Analytics | Only product intent metadata is allowed |

## Acceptance Criteria

1. `/tryon` shows the paid service card in the visit checklist area.
2. Payment CTA is disabled until at least one frame is saved.
3. Clicking payment CTA opens the fake payment modal.
4. Clicking `Оплатить 290 ₽` does not redirect, does not request card data, and does not call a payment provider.
5. Clicking `Оплатить 290 ₽` writes only `vilu_payment_intent_stats` to `localStorage`.
6. Clicking `Оплатить 290 ₽` sends `payment_intent_clicked` to Metrika through `trackEvent`.
7. Event params contain only `offer_id`, `price`, `selected_count`, `intent_clicks`, and `source`.
8. New text translates to English when the language toggle is switched.
9. Existing try-on, save frame, nearby optics, and visit lead flows continue to work.
10. `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Testing Plan

| Layer | What | Count |
|---|---|---|
| Unit / static | TypeScript validates new events and modal state | Existing `npm run typecheck` |
| Lint | No new lint errors | Existing `npm run lint` |
| Build | Production Vite build succeeds | Existing `npm run build` |
| Manual QA | Save one frame, open fake payment modal, click pay, verify message | +1 |
| Manual QA | Switch RU/EN and verify payment copy translates | +1 |
| Manual QA | Inspect Network/DevTools and confirm no payment provider/card request | +1 |
| Analytics QA | In Metrika goals, verify `payment_door_viewed` and `payment_intent_clicked` appear | +1 |

## Manual QA Script

1. Open `/tryon`.
2. Save one frame to selection.
3. Confirm the paid service card becomes clickable.
4. Click `Проверить готовность платить`.
5. Confirm modal text says payment is not connected and no money is charged.
6. Click `Оплатить 290 ₽`.
7. Confirm success text appears.
8. Open DevTools → Application → Local Storage.
9. Confirm `vilu_payment_intent_stats` exists and increments.
10. Open DevTools → Network.
11. Confirm there is no request to a payment provider.
12. Switch language to EN.
13. Confirm card and modal copy are translated.

## Rollback Plan

Revert the implementation commit:

```bash
git revert ebba0da
```

This removes:

1. Payment fake door UI from `/tryon`.
2. Payment intent localStorage writes.
3. Payment analytics events.
4. Translation additions.

No migration is needed because the feature does not write server data.

## Effort Estimate

| Work | Estimate |
|---|---:|
| Product copy and offer placement | 0.5h |
| UI card and modal | 1.5h |
| Local intent counter | 0.5h |
| Analytics events | 0.5h |
| RU/EN translations | 0.5h |
| QA and build verification | 1h |
| Total | 4.5h |

## Files Reference

| File | Change |
|---|---|
| `src/pages/TryOnPilot.tsx` | Add service offer, fake payment modal, local counter, click handlers |
| `src/lib/analyticsEvents.ts` | Add payment door analytics events |
| `src/components/LanguageDomBridge.tsx` | Add RU/EN translations for new payment copy |
| `docs/specs/fake-payment-intent-door.md` | This spec |

## Out of Scope

1. Real acquiring / YooKassa / Stripe / CloudPayments integration.
2. Card input fields.
3. Invoices, receipts, fiscalization, refunds.
4. Charging users.
5. Saving contact data as part of payment.
6. Guaranteeing frame availability in stores.
7. Medical consultation or diagnosis.

## Open Questions For Later

1. What conversion threshold validates the offer: 3%, 5%, or 10% click-to-pay from saved selections?
2. Should the offer be 190 ₽, 290 ₽, 490 ₽, or A/B tested?
3. Should the paid service be sold to users directly or funded by partner optics as a lead-prep fee?
4. Should this eventually connect to Tally, Supabase, or a real payment provider?

## Engineering Review

Review date: 2026-07-12
Branch: `codex/fake-payment-intent-door`
Review mode: `/plan-eng-review`

### Step 0 Scope Challenge

The current implementation is appropriately small for a fake payment door. It reuses the existing `/tryon` page, existing selection state, existing `trackEvent` analytics bridge, existing localStorage pattern, and existing RU/EN DOM translation bridge.

The minimum complete change is:

1. Show the paid-service offer only inside the existing visit checklist area.
2. Gate the CTA until at least one frame is saved.
3. Open a modal that clearly says no payment is connected and no money is charged.
4. Count intent locally and send anonymized analytics events.
5. Preserve existing try-on, selection, nearby optics, and visit lead flows.

No separate payment service, backend table, payment provider, or lead pipeline is needed for this version. Adding those now would create legal, privacy, and product risk before the demand signal is validated.

### What Already Exists

| Existing system | Reused? | Notes |
|---|---:|---|
| `/tryon` CJM | Yes | The payment door is attached after value is delivered: saved frames and visit checklist. |
| `selectedFrames` state | Yes | Used as the gating signal. No new selection model is needed. |
| `trackEvent` analytics bridge | Yes | New payment events use the same analytics path as existing intent events. |
| Local intent storage | Yes | `vilu_payment_intent_stats` follows the existing local-only MVP posture. |
| `LanguageDomBridge` | Yes | RU/EN copy is translated without introducing a second i18n system. |
| Visit lead consent flow | Yes | Kept separate; fake payment does not bypass contact consent. |

### Architecture

The feature should remain a client-only fake door until product validation is complete.

```text
User
  |
  | save >= 1 frame
  v
/tryon page
  |
  | renders paid service card in visit checklist
  v
Payment door modal
  |                         \
  | click "pay"              \ close
  v                           v
localStorage counter        payment_door_dismissed event
  |
  v
payment_intent_clicked event
  |
  v
Yandex Metrika aggregate reporting
```

Component boundary:

```text
src/pages/TryOnPilot.tsx
  ├── selection state
  ├── payment-door modal state
  ├── localStorage read/write helpers
  ├── analytics event calls
  └── visit lead flow remains separate

src/lib/analyticsEvents.ts
  └── event-name registry only

src/components/LanguageDomBridge.tsx
  └── copy translation only
```

Recommendation: keep the fake door inside `TryOnPilot.tsx` for this MVP. Extracting a `PaymentDoor` component is not required yet, because the feature has one offer, one entry point, and no reusable payment domain.

### System Boundaries

| Boundary | Owner | Allowed | Not allowed |
|---|---|---|---|
| Browser UI | ViLu frontend | Offer card, modal, fake success copy | Card forms, acquiring redirects |
| Browser storage | User device | Anonymous click count and timestamp | Name, phone, email, recipe, photo |
| Analytics | Metrika | Offer id, price, selected count, click count, source | Any personal, health, photo, exact location, or payment data |
| Visit lead flow | Existing MVP consent flow | Contact only after explicit consent | Reusing payment click as consent |
| Partner optics | Future | Aggregated intent reporting | Promise exact frame availability |

### Data Flow

```text
selectedFrames.length
  ├── 0
  │   └── paid CTA disabled
  └── >= 1
      └── paid CTA enabled
          └── openPaymentDoor("selection_card")
              ├── setIsPaymentDoorOpen(true)
              └── trackEvent(payment_door_viewed, safe payload)
                  └── user clicks "Оплатить 290 ₽"
                      ├── savePaymentIntentClick()
                      │   └── localStorage["vilu_payment_intent_stats"]
                      ├── trackEvent(payment_intent_clicked, safe payload)
                      └── show fake-payment success text
```

Safe analytics payload:

```text
offer_id
price
selected_count
intent_clicks
source
```

No event may include user-entered contact data, prescription data, symptoms, uploaded photo, or precise geolocation.

### State Transitions

```text
[No saved frames]
  └── save frame
      v
[Offer visible + CTA enabled]
  └── click CTA
      v
[Modal open: unpaid/fake-door disclosure]
  ├── close
  │   v
  │ [Offer visible + dismissed event]
  └── click fake pay
      v
    [Intent recorded + success message]
      └── close
          v
        [Offer visible]
```

Important state rule: `payment_intent_clicked` means "user clicked a fake payment CTA", not "user paid". Do not name dashboards, goals, or reports as revenue.

### Failure Modes

| Failure mode | Current handling | User impact | Test needed |
|---|---|---|---|
| `localStorage` contains invalid JSON | `getPaymentIntentCount()` returns `0` | Counter resets silently, UI still works | Manual/localStorage corruption check |
| `localStorage.setItem` throws because storage is full/blocked | Not handled in `savePaymentIntentClick()` | Click could fail before success message | Add try/catch before public launch |
| Metrika blocked by ad blocker | Existing `trackEvent` should no-op/fail harmlessly | Local UX still works, aggregate signal missing | Manual ad-block/no-network check |
| User double-clicks fake pay | Count increments twice | Intent may be overcounted | Disable after first click or accept as repeated intent |
| User closes after fake pay | `payment_door_dismissed` also fires | Dashboard may count paid click and dismissal | Define dismissal as "modal closed", not "rejected" |
| User switches language while modal open | DOM bridge should translate visible copy | Copy may partially remain RU/EN if selector missed | RU/EN modal QA |
| User has one saved frame | Door enabled by spec | Offer can validate willingness before full 2-frame visit lead | Keep as intentional product decision |

Critical gap assessment: no production-blocking gap for MVP. The only pre-public-hardening item is wrapping `localStorage.setItem` in try/catch so blocked storage cannot break the click handler.

### Code Quality Review

Verified code references:

| Area | Reference | Assessment |
|---|---|---|
| Storage key | `src/pages/TryOnPilot.tsx:57` | Explicit and scoped. |
| Offer config | `src/pages/TryOnPilot.tsx:59` | Good single source for price/title. |
| Counter read | `src/pages/TryOnPilot.tsx:295` | Handles invalid JSON. |
| Counter write | `src/pages/TryOnPilot.tsx:308` | Needs try/catch before hard public campaign. |
| Door open event | `src/pages/TryOnPilot.tsx:535` | Payload is safe. |
| Click event | `src/pages/TryOnPilot.tsx:546` | Payload is safe. |
| Dismiss event | `src/pages/TryOnPilot.tsx:558` | Semantics should be documented in analytics. |
| Event registry | `src/lib/analyticsEvents.ts:46` | Clear event names. |

No new service or abstraction is required yet. If a second paid offer appears, extract:

```text
src/lib/paymentIntent.ts
src/components/PaymentDoorModal.tsx
```

Do not extract now.

### Test Coverage Plan

Existing project test commands:

```text
npm run typecheck
npm run lint
npm run build
npm run smoke
```

Coverage map:

```text
CODE PATHS                                      USER FLOWS
[+] paymentDoorDisabled                         [+] Save frame -> unlock payment CTA
  ├── [manual] selectedFrames = 0                  ├── [GAP -> E2E] CTA disabled before save
  └── [manual] selectedFrames >= 1                 └── [GAP -> E2E] CTA enabled after save

[+] openPaymentDoor()
  ├── [manual] clears status
  ├── [manual] opens modal
  └── [manual] sends payment_door_viewed

[+] clickPaymentIntent()
  ├── [manual] increments localStorage
  ├── [manual] sends payment_intent_clicked
  ├── [GAP] storage blocked/throws
  └── [manual] shows no-charge message

[+] closePaymentDoor()
  ├── [manual] closes modal
  └── [manual] sends payment_door_dismissed

[+] RU/EN translation
  ├── [manual] card copy
  └── [manual] modal copy
```

Required manual QA before merge/deploy:

| ID | Route | Case | Expected result |
|---|---|---|---|
| P-01 | `/tryon` | No saved frames | Paid CTA is disabled with explanatory text. |
| P-02 | `/tryon` | Save one frame | Paid CTA becomes clickable. |
| P-03 | `/tryon` | Open modal | Modal says payment is not connected and money is not charged. |
| P-04 | `/tryon` | Click fake pay | Success text appears, no redirect, no card fields. |
| P-05 | `/tryon` | Inspect localStorage | `vilu_payment_intent_stats.count` increments. |
| P-06 | `/tryon` | Inspect Network | No payment provider request appears. |
| P-07 | `/tryon` | Switch EN/RU | Offer and modal copy translate. |
| P-08 | `/tryon` | Continue visit lead | Existing consent/contact flow still works independently. |
| P-09 | `/tryon` mobile 390px | Open modal | Buttons and text fit without clipping. |

Recommended smoke addition, not required for this PR:

```text
scripts/smoke-routes.mjs should continue to verify /tryon loads.
```

Recommended future E2E:

```text
tests/e2e/fake-payment-door.spec.ts
  - disabled before selection
  - enabled after selection
  - fake pay increments localStorage
  - no payment-provider request
  - EN/RU copy switches
```

### Performance Review

The feature has negligible runtime cost:

1. No new package.
2. No network request beyond existing analytics.
3. One localStorage read/write only on click.
4. No render-time expensive calculation.

Performance risk is low. The only consideration is that repeated DOM-bridge translation selectors should not grow unbounded as more fake-door copy is added. For this release, it is fine.

### Privacy And Trust Review

This is the main risk area. The current architecture is acceptable because:

1. It does not request bank card data.
2. It does not send user identity.
3. It does not store health data.
4. It explains the fake-door status before the user can "pay".

Copy requirement: every fake payment modal must keep the phrase equivalent to:

```text
Платежная интеграция пока не подключена, деньги не списываются.
```

Do not move that disclosure after the click. It must stay visible before the fake payment CTA.

### NOT In Scope

| Item | Rationale |
|---|---|
| Real acquiring | Requires legal, fiscal, refund, and support readiness. |
| Card input | Would create payment-data trust boundary before validation. |
| Server-side intent table | Local + analytics is enough for demand testing. |
| Contact collection inside payment modal | Consent and lead flow already exist separately. |
| A/B testing price | Useful later after baseline conversion is measured. |
| Partner optics dashboard | Needs validated repeated demand first. |
| Revenue reporting | Fake-door click is intent, not payment or revenue. |

### Worktree Parallelization Strategy

Sequential implementation, no parallelization opportunity. The change is intentionally scoped to one page, one analytics registry, one translation bridge, and one spec. Splitting across worktrees would create merge friction without reducing risk.

### Engineering Verdict

Ship as MVP fake-door experiment after manual QA. The plan is small, reversible, privacy-conscious, and aligned with the current local/demo posture. Before a larger paid campaign, add storage error handling and one E2E test for the no-payment-provider guarantee.

## GSTACK REVIEW REPORT

| Review | Command | Purpose | Runs | Status | Findings |
|---|---|---|---:|---|---|
| Eng Review | `/plan-eng-review` | Architecture, data flow, trust boundaries, failure modes, tests | 1 | CLEAR | No production-blocking gaps; one pre-public hardening item for localStorage write errors |

VERDICT: CLEAR FOR MVP FAKE-DOOR DEPLOYMENT

NO UNRESOLVED DECISIONS
