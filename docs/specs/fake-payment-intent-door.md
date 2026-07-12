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
