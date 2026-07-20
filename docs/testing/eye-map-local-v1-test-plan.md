# Eye Map local v1: test plan

Status: engineering and design-reviewed  
Feature flag: `VITE_FEATURE_EYE_MAP`

## Release gate

Eye Map можно включить только если:

- release decision manifest валиден, содержит `GO_LOCAL_V1`, все четыре
  approvals и SHA текущего release ADR;
- фото не покидает вкладку и не попадает в `localStorage`, URL или аналитику;
- основной `/tryon` работает при включенном, выключенном и сломанном Eye Map;
- сохранение baseline является отдельным явным действием;
- история содержит максимум 12 валидных технических результатов;
- демонстрационный benchmark явно обозначен как демонстрационный;
- RU/EN и мобильные сценарии проходят E2E;
- на темном фоне нет темного текста, на светлом — низкоконтрастного.
- MediaPipe model artifact закреплен точной версией и checksum, без `latest`;
- MediaPipe не загружается до camera/photo action.

## Boundary decision matrix

| Состояние | Ожидание CI |
| --- | --- |
| Release manifest отсутствует | `/eye-map` запрещен |
| Решение `NO_GO` | `/eye-map` запрещен |
| Есть хотя бы один reject/missing approval | `/eye-map` запрещен |
| ADR отсутствует или его SHA изменился | `/eye-map` запрещен |
| Решение `GO_LOCAL_V1`, 4 approvals, SHA совпадает | route разрешен, `.env.example` по-прежнему false |
| Попытка bypass через env/CLI/branch | boundary check остается красным |

## Unit matrix

| Область | Проверка |
| --- | --- |
| Adapter | `FaceFitMeasurement` преобразуется только в разрешенные поля |
| Adapter | неподдерживаемый статус дает blocked/result unavailable |
| Adapter | `overlayPoints` и исходные измерения не попадают в storage result |
| Adapter | baseline сравнивается только при совместимой версии |
| Compatibility | несовместимая версия остается в истории без числового сравнения |
| Manifest | exact model version/checksum обязательны, `latest` запрещен |
| Storage | поврежденный JSON безопасно очищается |
| Storage | неизвестная версия не читается как актуальная |
| Storage | после 13-го сохранения остается 12 последних записей |
| Storage | фото, blob URL, landmarks и PII отклоняются |
| Reducer | допустимые переходы соответствуют спецификации |
| Reducer | stale `analysisId` не меняет актуальное состояние |
| Reducer | back/retake/new photo инвалидируют текущий `analysisId` |
| Copy | RU и EN имеют одинаковый типизированный набор ключей |
| Analytics types | каждое событие принимает только собственный payload; неизвестные события, ключи и reason codes не проходят typecheck |
| Analytics runtime | serializer удаляет неизвестные ключи и не передает фото, URL, landmarks, baseline, profile или feature values |
| Analytics isolation | UI Eye Map использует typed wrapper и не вызывает generic analytics transport напрямую |

## Component matrix

| Сценарий | Ожидание |
| --- | --- |
| Первый вход | Понятное local-only уведомление, baseline отсутствует |
| Camera denied | Доступен upload/retry, экран не зависает |
| Engine unavailable | Показана безопасная ошибка и повтор |
| Low quality | Результат не сохраняется, есть инструкция переснять |
| Good capture | Показан технический результат без медицинских claims |
| Save baseline | Появляется подтверждение локального сохранения |
| Clear history | Все записи удалены, UI возвращается в first-use |
| Demo benchmark | Всегда виден бейдж `Демонстрационные данные` |
| Language switch | Весь экран меняет RU/EN без сброса результата |
| Feature off | Ссылка скрыта, прямой маршрут показывает безопасное unavailable-состояние |
| Sequential flow | На экране виден только текущий шаг и одно главное действие |
| Back navigation | Возврат не сбрасывает уже полученный безопасный результат |
| Camera guidance | Одновременно видна только одна актуальная инструкция |
| Analysis progress | Статусы идут `Проверяем качество` -> `Строим Eye Map` -> `Готово` |
| Result hierarchy | Сначала текстовый вывод, затем изображение и четыре строки метрик |
| Result scoring | Нет сводного Eye Map score; repeatability явно связан с baseline |
| Top navigation | Eye Map не добавлен в основную навигацию local v1 |
| Engine loading | До camera/photo action нет запроса WASM/model |
| Camera cleanup | Ошибка/закрытие освобождает tracks и object URL, lock сброшен |

## Playwright matrix

| Width | Locale | Flow |
| ---: | --- | --- |
| 320 | RU | camera denied -> upload -> analyze -> result |
| 375 | EN | guided camera -> blocked quality -> retake |
| 390 | RU | capture -> result -> save baseline |
| 430 | EN | result -> history -> clear |
| 768 | RU | upload -> analyze -> demo benchmark |
| 1280 | EN | direct route -> upload -> Eye Map -> result |
| 1440 | RU | Vision Tracker entry -> baseline comparison |

Для каждого сценария проверять:

- отсутствие горизонтального скролла;
- доступность основных кнопок с клавиатуры;
- отсутствие обрезанного текста;
- контраст результата, ошибок и disabled controls;
- отсутствие console errors;
- отсутствие запросов с фото, landmarks или техническими значениями;
- освобождение camera tracks и blob URL после выхода.
- только один желтый primary CTA в текущем шаге;
- touch targets не меньше `44x44 px`;
- видимый keyboard focus и корректный `aria-live`;
- отсутствие сводного Eye Map score;
- landmarks скрыты по умолчанию;
- demo benchmark расположен ниже личного результата и не выглядит активным;
- fixed capture control не перекрывает контент и учитывает mobile safe area;
- поведение с `prefers-reduced-motion: reduce`.

## Coverage and runtime gates

- `@vitest/coverage-v8`: 100% lines/functions/branches/statements для reducer,
  adapter, local store и compatibility helpers;
- component/E2E используют mocked MediaPipe;
- отдельный smoke инициализирует реальный pinned model artifact;
- ручной release gate: Chrome/Android и Safari/iPhone с реальной камерой;
- пользовательские selfie в fixtures и репозиторий не добавляются.

## Visual state matrix

| Состояние | Обязательная проверка |
| --- | --- |
| Intro | Польза, local-only и немедицинское ограничение считываются за 3 секунды |
| Preparation | Видны только три кратких правила съемки |
| Camera ready | Камера доминирует, upload является вторичным действием |
| Preparation advice | Свет, отсутствие бликов и неподвижность обозначены как статические рекомендации, а не результат автоматического измерения |
| Camera hint | Показана ровно одна автоматически рассчитанная причина: расстояние или высота камеры |
| Analyzing | Нет layout shift; состояние озвучивается |
| Result good | Первый вывод `Снимок подходит для наблюдения` |
| Result retake | Первый вывод `Лучше переснять фотографию` и одна причина |
| No baseline | Понятно, что это первая точка отсчета |
| Baseline saved | Есть дата, локальный статус и явная команда удаления |
| Demo benchmark | Постоянный demo badge, нет percentile/ranking и primary CTA |
| Error | Нет технических терминов; доступен один очевидный recovery path |

## Regression

Обязательные команды:

```powershell
npm run lint
npm test -- --run
npm run build
npm run test:e2e
```

Дополнительно вручную:

1. Открыть `/tryon`, загрузить фото и проверить автопосадку.
2. Открыть `/products`, checkout и кабинет.
3. Повторить с `VITE_FEATURE_EYE_MAP=false`.
4. Убедиться, что MediaPipe не загружается на страницах без анализа фото.
5. Проверить реальную камеру в Chrome/Android и Safari/iPhone.

## Phase 1.1 follow-up

Передача уже снятого фото из `/tryon` не входит в первый PR. Для Phase 1.1
добавляется отдельная матрица: tab-memory-only transfer, reload fallback,
feature flag off и regression существующей примерки.
