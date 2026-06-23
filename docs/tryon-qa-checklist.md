# Try-On QA Checklist

Use this checklist for every change touching:

- `/tryon`
- `src/pages/TryOnPilot.tsx`
- `src/lib/faceFitEngine.ts`
- `src/data/pilotOptics.ts`
- frame assets under `public/frames/`

## Layout

- [ ] Desktop layout has no horizontal overflow.
- [ ] 390px mobile width works.
- [ ] 320px mobile width works.
- [ ] Header does not cover primary controls.
- [ ] Auto-fit panel text does not collapse into one-letter columns.
- [ ] Buttons remain clickable after uploading a photo.
- [ ] Slider controls stay visible and usable.

## Upload States

- [ ] Empty state asks user to upload a face photo.
- [ ] JPEG photo loads.
- [ ] PNG photo loads.
- [ ] WebP photo loads.
- [ ] HEIC/HEIF is rejected with clear copy.
- [ ] Broken or unsupported image does not crash the page.

## MediaPipe / Auto-Fit

- [ ] UI says `Автопосадка оправы`, not `MediaPipe` or `Face Landmarker`.
- [ ] Landmarks are hidden by default.
- [ ] `Показать ориентиры` works after a face is detected.
- [ ] `Скрыть ориентиры` hides points again.
- [ ] `Подстроить автоматически` is disabled before a valid face photo.
- [ ] After a valid photo, auto-fit applies a starting frame position.
- [ ] If MediaPipe fails, manual try-on remains usable.
- [ ] If no face is found, the user sees a clear retry instruction.
- [ ] If multiple faces are found, the user sees a clear single-face instruction.

## Face-Fit Score

- [ ] `Оценить посадку` works after selecting a frame.
- [ ] Score copy remains preliminary, not medical or absolute.
- [ ] Auto-fit result is connected to Face-fit score when available.
- [ ] `Сохранить в подбор` adds the current frame.
- [ ] Selection counter allows up to 3 frames.

## Privacy

- [ ] Page says the photo stays in the browser.
- [ ] No uploaded photo is sent to a server.
- [ ] No name, phone, email, prescription, complaint, exact location, or photo data is sent to analytics.
- [ ] Browser DevTools Network shows only static assets, MediaPipe model/WASM, and safe analytics requests.

## Store Intent Flow

- [ ] `Найти оптику рядом` stays disabled or non-primary until the user has saved frames.
- [ ] City fallback works when geolocation is unavailable.
- [ ] Route button opens a map.
- [ ] Phone button uses `tel:`.
- [ ] WhatsApp and Telegram buttons handle missing contacts safely.
- [ ] Copy selection works.

## Regression Notes

Known fragile areas:

- Auto-fit panel can regress into narrow columns if nested grid/flex children lack `min-w-0`.
- Long Cyrillic labels need wrapping and stable button dimensions.
- Mobile header can hide content if top spacing changes.

