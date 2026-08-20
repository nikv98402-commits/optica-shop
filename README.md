# ViLu Optica Shop

Интернет-магазин оптики на React, TypeScript, Vite и Tailwind CSS.

## Онлайн-демо для iPhone

После успешного GitHub Actions деплоя демо должно открываться как обычный сайт:

https://vilu.store/

Ссылку можно открыть прямо на iPhone в Safari/Chrome — ничего устанавливать не нужно.

Fallback GitHub Pages URL после перехода на корневой custom domain может не работать как `/optica-shop/`, потому что Vite собирает ассеты для корня домена.

## Релиз на vilu.store

1. В настройках DNS домена `vilu.store` добавить A-записи для apex-домена:

```text
@  A  185.199.108.153
@  A  185.199.109.153
@  A  185.199.110.153
@  A  185.199.111.153
```

2. Для `www.vilu.store` добавить CNAME:

```text
www  CNAME  nikv98402-commits.github.io
```

3. В GitHub открыть `Settings -> Pages`.
4. В `Build and deployment` выбрать `GitHub Actions`, если еще не выбрано.
5. В `Custom domain` указать:

```text
vilu.store
```

6. Сохранить домен и дождаться DNS check.
7. Включить `Enforce HTTPS`, когда GitHub выпустит сертификат.
8. Смёржить релизную ветку в `main` или вручную запустить workflow `Deploy demo to GitHub Pages`.

Файл `public/CNAME` добавлен как явный артефакт домена и fallback для статической публикации, но при деплое через GitHub Actions домен все равно нужно сохранить в `Settings -> Pages -> Custom domain`. Vite настроен на `base: '/'`, потому что сайт будет жить в корне `https://vilu.store/`, а не в подпапке `/optica-shop/`.

## Что уже есть

- Главная страница с промо-блоком, преимуществами и витриной хитов.
- Каталог оправ, солнцезащитных очков и контактных линз.
- Фильтры по категории, бренду и товарам для примерки.
- Карточка товара с ценой, наличием, подпиской для линз и переходом к оформлению.
- Единый checkout подготовки визита: 1-3 оправы, выбор города/салона, согласие, заявка и тестовый платеж 429 RUB без реального списания.
- Модальное окно салонов с поиском по городу и адресу.
- Demo-кабинет зрения с подпиской, прогрессом до бесплатного осмотра и упражнением для глаз.
- Релизный CJM для онлайн-подбора: цель подбора, загрузка фото, примерка, Face-fit score, сохранение 2-3 оправ, ближайшие оптики и intent-действия.
- Ручной MVP-справочник оптик в `src/data/opticsDirectory.ts` без API-ключей и backend.
- Privacy-текст: фото используется только в браузере для примерки и не отправляется на сервер.
- Локальные demo-товары, поэтому витрина работает без Supabase-переменных окружения.
- Защищённый Slice 0 для рабочих пространств сотрудника, работодателя и клинического партнёра: Supabase Auth, организации и роли с RLS, строгий RU/EN, Optical Signal primitives и выключенные по умолчанию feature flags.
- Защищённый Slice 1 для сотрудника: двуязычный Guided Optical маршрут `Сегодня -> Результат -> Направление`, восстановление черновика после перезагрузки и безопасный следующий шаг без постановки диагноза.

## ViLu защищённые рабочие пространства

Новые рабочие пространства доступны только при настроенном Supabase и явном включении двух уровней rollout: глобального `VITE_FEATURE_VILU_FOUNDATION` / соответствующего `VITE_FEATURE_VILU_*` и одноимённого флага активной организации. Маршрут всегда содержит locale и стабильный `organizationId`:

```text
/:locale/organizations/:organizationId/employee/today
/:locale/organizations/:organizationId/employer/outcomes
/:locale/organizations/:organizationId/provider/queue
```

Соответствие переменных и ключей организации: `VITE_FEATURE_VILU_AUTH_V2` → `vilu_auth_v2`, `VITE_FEATURE_VILU_EMPLOYEE_FLOW_V2` → `vilu_employee_flow_v2`, `VITE_FEATURE_VILU_PROVIDER_QUEUE_V2` → `vilu_provider_queue_v2`, `VITE_FEATURE_VILU_PASSPORT_PROFILE_V2` → `vilu_passport_profile_v2`, `VITE_FEATURE_VILU_EMPLOYER_OUTCOMES_V2` → `vilu_employer_outcomes_v2`.

Проверка роли, feature flag и данных выполняется для одной активной организации. Пользователь без активного членства не получает доступ к чужому workspace. Миграция находится в `supabase/migrations/20260819090000_create_vilu_identity_foundation.sql`, а локальные allowed/denied проверки RLS запускаются через `npm run test:rls`.

Slice 1 реализует только маршрут сотрудника под `vilu_employee_flow_v2`:

```text
/:locale/organizations/:organizationId/employee/today
/:locale/organizations/:organizationId/employee/screenings/:screeningId/result
/:locale/organizations/:organizationId/employee/referrals/:referralId
```

Черновик скрининга, завершённый результат и направление всегда связаны с `activeOrganizationId` и текущим сотрудником. Прогресс сохраняется идемпотентным RPC и восстанавливается после перезагрузки; направление создаётся атомарно и идемпотентно. Работодатель, другой сотрудник и участник другой организации не могут читать эти данные. Контракт находится в `supabase/migrations/20260819130000_create_vilu_employee_care_flow.sql`; Passport, Profile, Employer Outcomes и Provider Queue в этом Slice остаются placeholder-экранами за выключенными флагами.

## Релизный MVP-поток

Правильный сценарий перед релизом:

1. Пользователь выбирает цель подбора: офис, каждый день, солнцезащитные, компьютер, выразительная оправа или минимализм.
2. Загружает фото и примеряет 6 оправ.
3. Получает Face-fit score и подсказки, что проверить в салоне.
4. Сохраняет 2-3 варианта в подбор.
5. Нажимает `Найти оптику рядом`.
6. Разрешает геолокацию или выбирает город вручную.
7. Получает ближайшие оптики с действиями: маршрут, звонок, WhatsApp, Telegram, копировать подбор.

Это не классический лид и не справочник оптик. Это intent-сигнал после персонального подбора: пользователь уже понял, какие оправы ему подходят, и выбирает точку для финальной примерки.

## Лиды и персональные данные

Фото остается в браузере и не отправляется на сервер. Checkout подготовки визита собирает необязательное имя, выбранный канал связи, контакт и явное согласие, после чего `submit-visit-lead` сохраняет заявку и 1-3 выбранные оправы в Supabase. Контакт не записывается в browser storage, URL, clipboard fallback или аналитику.

После успешной заявки браузер хранит в `sessionStorage` только технический контекст попытки: `leadId`, короткоживущий `paymentCapabilityToken`, idempotency key и timestamp безопасного черновика. Имя, контакт, фото, рецепт и медицинские данные туда не попадают.

Текущая реализация поддерживает этот сценарий через переменную окружения:

```bash
VITE_TALLY_FORM_URL=https://tally.so/r/FORM_ID
```

Для GitHub Pages задайте это как Repository variable: `Settings` → `Secrets and variables` → `Actions` → `Variables` → `New repository variable` → `VITE_TALLY_FORM_URL`.

Если `VITE_TALLY_FORM_URL` задана, Tally используется как резервная форма при недоступном backend или смешанной версии frontend/backend. В URL передаются только безопасные prefill-параметры: город, способ связи, цель, количество и названия оправ, источник. Имя и контакт пользователь вводит повторно уже в форме; фото, рецепт, жалобы, точная геолокация и параметры зрения не передаются. Если Tally URL не задан, try-on сохраняет безопасный fallback: копирует подбор в буфер обмена и ничего не отправляет на сервер.

В backend-first checkout Tally также используется как аварийный fallback, если Supabase временно недоступен или frontend/backend находятся на разных этапах релиза. Порядок безопасного развертывания и rollback описан в [`docs/deployment/service-checkout-rollout.md`](docs/deployment/service-checkout-rollout.md).

События аналитики централизованы в `src/lib/analyticsEvents.ts`. В Метрику уходят только безопасные параметры вроде `selected_count`, `city`, `contact_type`, `source`, `optic_id`; телефон, email, имя, рецепт, жалобы, пароль и фото фильтруются на уровне wrapper-функции.

Реальное списание по-прежнему отключено: сумма 429 RUB определяется сервером, а текущий provider mode создает только тестовое платежное намерение. Подключение YooKassa, webhook-подтверждение, чеки, возвраты и сверка остаются следующими этапами.

## GenEO и контентная архитектура

ViLu должен продвигаться не как очередная онлайн-примерка, а как русскоязычный источник по методологии предварительного подбора оправ:

> ViLu — сервис онлайн-примерки и предварительной оценки посадки оправы. Его методология Face-fit score помогает выбрать 2-3 модели для очной примерки, учитывая ширину оправы, положение глаз в линзах, мост, рецептурный риск и стиль.

Для первого релиза добавлена ViLu Knowledge Base:

- `/face-fit-score`
- `/kak-vybrat-razmer-opravy`
- `/pd-i-oprava`
- `/oprava-pri-vysokih-dioptriyah`
- `/primerit-ochki-online`
- `/podbor-opravy-po-forme-lica`
- `/ai-source`

Каждая страница содержит:

- `title`;
- `meta description`;
- canonical URL;
- H1;
- короткий ответ;
- определение;
- таблицу, где уместно;
- пошаговую инструкцию;
- пример;
- ограничения;
- FAQ;
- CTA;
- дату обновления;
- автора ViLu;
- источники;
- дисклеймер;
- JSON-LD: `Organization`, `WebSite`, `Article`, `FAQPage`, `BreadcrumbList`, а также `HowTo` для инструктивных страниц.

Техническая база:

- `public/robots.txt` разрешает OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Googlebot, Bingbot и Yandex; `GPTBot` закрыт.
- `public/sitemap.xml` перечисляет главную и 7 Knowledge Base страниц.
- `public/llms.txt` дает LLM краткую карту проекта, ключевые страницы и ограничения.
- `scripts/add-github-pages-routes.mjs` после сборки создаёт `404.html` и
  статические `index.html` для поддерживаемых SPA-маршрутов, включая прямые
  ссылки на все текущие карточки товаров GitHub Pages.
- `vercel.json` добавлен для Vercel: прямые SPA URL переписываются в extensionless
  entrypoint `/index`, совместимый с `cleanUrls`, а публичные файлы `robots.txt`,
  `sitemap.xml`, `llms.txt` остаются статическими.
- `docs/promotion-kit.md` содержит 3 готовых внешних поста для 7-го дня распространения.

## GenEO-измерение

Раз в неделю проверять видимость ViLu по запросам:

| Запрос | ChatGPT | Perplexity | Gemini | Яндекс Нейро | Есть ViLu? | Цитата | Позиция/видимость |
|---|---|---|---|---|---|---|---|
| как выбрать оправу по форме лица |  |  |  |  |  |  |  |
| как понять что очки подходят лицу |  |  |  |  |  |  |  |
| что значит размер оправы 52-18-140 |  |  |  |  |  |  |  |
| что такое PD в очках |  |  |  |  |  |  |  |
| как выбрать оправу при сильных диоптриях |  |  |  |  |  |  |  |
| можно ли примерить очки онлайн |  |  |  |  |  |  |  |
| что такое face-fit score для очков |  |  |  |  |  |  |  |
| как подобрать очки онлайн |  |  |  |  |  |  |  |
| какие очки подходят для офиса |  |  |  |  |  |  |  |
| как выбрать солнцезащитные очки по лицу |  |  |  |  |  |  |  |

В аналитике смотреть referrers:

- `chatgpt.com`;
- `perplexity.ai`;
- `gemini.google.com`;
- `google.com`;
- `yandex.ru`;
- `bing.com`;
- `copilot.microsoft.com`.

## Внешние сигналы на 30 дней

Минимальный план — получить 10 внешних упоминаний, которые связывают ViLu с темой онлайн-подбора оправ и Face-fit score:

- пост в VC.ru, Habr Q&A или профильном блоге;
- Telegram-каналы про retail, AI, здоровье или оптику;
- LinkedIn, Medium или личный блог;
- комментарии экспертов-оптометристов;
- 2-3 независимых обзора MVP;
- каталог стартапов;
- Product Hunt / Indie Hackers для англоязычного landing;
- GitHub repo или публичный документ с методологией Face-fit score;
- партнерская страница у 1-2 оптик;
- публикация “как мы считаем Face-fit score”.

Готовые черновики первых трех внешних публикаций лежат в `docs/promotion-kit.md`.

## Сценарий демонстрации

1. Открыть главную страницу и показать оффер: онлайн-подбор + ближайшие оптики.
2. Нажать `Начать подбор`.
3. Выбрать цель подбора.
4. Загрузить фото и показать privacy-текст.
5. Примерить несколько оправ.
6. Нажать `Оценить посадку`.
7. Сохранить 2-3 оправы в подбор.
8. Нажать `Найти оптику рядом`.
9. Разрешить геолокацию или выбрать город вручную.
10. Показать карточки оптик и действия: маршрут, звонок, WhatsApp, Telegram, копирование подбора.

## Codex

Для работы в Codex в репозиторий добавлен `AGENTS.md`.
Codex должен использовать его как проектный контекст: стек, команды проверки, зоны продукта и правила изменений.

## Документы для разработки

- `docs/dev-quickstart.md` — быстрый старт, env, проверки, smoke-тест и Windows caveat.
- `CONTRIBUTING.md` — правила веток, PR, privacy/analytics и try-on изменений.
- `docs/tryon-qa-checklist.md` — обязательный чеклист для `/tryon` и MediaPipe/Face-fit изменений.
- `docs/payments/yookassa-integration.md` — текущее состояние платежей, безопасная архитектура ЮKassa, API-контракты, webhook, тестирование, релиз и rollback.
- `docs/deployment/service-checkout-rollout.md` — порядок миграций, Edge Functions, frontend rollout и безопасного rollback checkout.
- `docs/qa/service-checkout-hardening-test-plan.md` — проверяемые checkout-сценарии и команды regression suite.
- `docs/specs/service-checkout-v1.md` — продуктовый и инженерный контракт единого checkout.
- `docs/architecture/knowledge-assistant.md` — архитектура, trust boundaries и контракты Knowledge Assistant.
- `docs/specs/knowledge-assistant-v1.md` — зафиксированная продуктовая и инженерная спецификация помощника.
- `docs/knowledge-assistant/source-review.md` — безопасное добавление и повторная проверка источников.
- `docs/deployment/knowledge-assistant.md` — preview rollout, секреты, индексирование и rollback.
- `docs/deployment/knowledge-corpus-publication.md` — проверка артефакта, возобновляемый stage-only upload, отдельная активация и rollback корпуса.
- `docs/testing/knowledge-assistant.md` — локальная проверка, privacy и RU/EN mobile QA.
- `tools/vilu-corpus/README.md` — изолированный corpus pipeline, bounded pilot, безопасная диагностика и ограничения артефактов.
- `CHANGELOG.md` — история релизных изменений.
- `.env.example` — безопасный шаблон опциональных переменных окружения.

### Статус платежей

Публичная версия пока не списывает деньги: UI проверяет спрос, а `create-payment-intent` сохраняет только backend-намерение. Перед включением `PAYMENT_PROVIDER=yookassa` обязательно выполнить блокеры и Definition of Done из `docs/payments/yookassa-integration.md`. Секреты платежного провайдера запрещено добавлять в `VITE_*`, frontend-код или GitHub Pages.

## Запуск локально

```bash
npm install
npm run dev
```

## Проверки

```bash
npm run typecheck
npm run build
npm run lint
npm test
npm run test:checkout
npm run test:rls
npm run test:e2e
npm run knowledge:index:dry
npm run test:knowledge-boundary
```

Если dev-сервер уже запущен, можно проверить ключевые маршруты:

```bash
npm run smoke
```

## Публикация

Проект настроен для GitHub Pages через `.github/workflows/deploy-pages.yml`.
Workflow запускается при каждом push в `main`, выполняет typecheck, сборку Vite и публикует папку `dist`.

## Supabase

В проекте сохранены Supabase-файлы и миграции. Для подключения реальной базы добавьте переменные окружения:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Для локальной проверки защищённых ViLu workspace-маршрутов нужен Supabase CLI или Docker-совместимое окружение. Запустите локальный стек, примените identity- и employee-care-миграции и выполните RLS-тесты:

```bash
npx --yes supabase@2.115.0 start
npx --yes supabase@2.115.0 db reset
npm run test:rls
```

Все `VITE_FEATURE_VILU_*` в `.env.example` намеренно равны `false`. Не включайте foundation routes до применения identity-миграции, а employee flow — до применения employee-care-миграции и успешного прохождения RLS-тестов.

Текущая витрина использует `src/data/products.ts`, поэтому может запускаться как автономный
demo-магазин. Если Supabase настроен, карточка товара дополнительно запрашивает свежие
предложения через Edge Function `offer-finder`. При недоступном API каталожная цена и основной
сценарий покупки остаются доступными.

Для Edge Function задайте список разрешённых origins на стороне Supabase:

```bash
OFFER_FINDER_ALLOWED_ORIGINS=https://vilu.store,https://www.vilu.store
```

Сервисный ключ остаётся только в окружении Supabase Edge Functions. Его нельзя добавлять в
`VITE_*`, frontend-код или публичные настройки Vercel. Контракт endpoint, правила свежести и
проверки описаны в [`docs/offer-finder-foundation.md`](docs/offer-finder-foundation.md).
