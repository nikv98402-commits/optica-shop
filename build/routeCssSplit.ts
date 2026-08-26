const ROUTE_STYLES_ID = 'virtual:vilu-route-styles.css';
const RESOLVED_ROUTE_STYLES_ID = `\0${ROUTE_STYLES_ID}`;
const ROUTE_STYLES_START = '/* Optical Orbits v5 — online try-on */';
const ROUTE_STYLES_END = '/* Optical Orbits v5 — shared typography contract.';
const HOME_FINAL_STYLES_START = '/* Must stay last: deterministic dark/light cadence for the home page. */';
const FOUNDATION_STYLES_START = '@layer components {';
const SHARED_STYLES_START = ':root {';

export function routeCssSplit() {
  let routeStyles = '';
  return {
    name: 'vilu-route-css-split',
    enforce: 'pre' as const,
    resolveId(id: string) {
      return id === ROUTE_STYLES_ID ? RESOLVED_ROUTE_STYLES_ID : null;
    },
    load(id: string) {
      return id === RESOLVED_ROUTE_STYLES_ID ? routeStyles : null;
    },
    transform(code: string, id: string) {
      if (!id.replaceAll('\\', '/').endsWith('/src/index.css')) return null;
      const start = code.indexOf(ROUTE_STYLES_START);
      const end = code.indexOf(ROUTE_STYLES_END);
      const homeFinalStart = code.indexOf(HOME_FINAL_STYLES_START);
      const foundationStart = code.indexOf(FOUNDATION_STYLES_START);
      const sharedStart = code.indexOf(SHARED_STYLES_START);
      if (foundationStart < 0 || sharedStart <= foundationStart || start <= sharedStart || end <= start || homeFinalStart <= end) {
        throw new Error('ViLu route CSS split markers are missing or out of order.');
      }
      // Lazy CSS is appended after the critical stylesheet. Repeat the shared
      // route cascade so its original "route styles, then shared overrides"
      // ordering remains deterministic without duplicating the Home-only tail.
      routeStyles = `@tailwind components;\n${code.slice(foundationStart, sharedStart)}${code.slice(start, end)}${code.slice(end, homeFinalStart)}`;
      return `${code.slice(0, foundationStart)}${code.slice(sharedStart, start)}${code.slice(end)}`;
    },
  };
}
