# Knowledge Assistant testing

## Automated checks

```powershell
npm run typecheck
npm run lint
npm test
npm run knowledge:index:dry
npm run test:knowledge-boundary
npm run build
npm run test:e2e
```

Playwright supplies fake public Supabase values and intercepts the assistant
request. It never needs real provider credentials. Provider, retrieval,
citation, urgent, and abstention paths use deterministic test doubles.

## Manual preview checklist

- With the flag off, no navigation entry appears and `/assistant` redirects.
- With the flag on, RU is the default; switching to EN translates all assistant
  controls, empty/error states, preferences, source headings, and disclaimers.
- At 320 px there is no horizontal overflow and input, submit, settings,
  sources, feedback, retry, and clear remain reachable.
- A supported answer has numbered, clickable citations from the registry.
- An unsupported question abstains instead of answering from model memory.
- Sudden vision loss or severe pain produces urgent guidance before retrieval.
- Provider/offline failure keeps the draft and offers retry.
- Reload preserves local history; clear removes history and preferences.
- DevTools Network contains no profile, photo, prescription, contact, location,
  or hidden system configuration.
- Analytics contains no query or answer text, symptoms, free-form preferences,
  user URLs, contact values, or history.
