import { expect, test } from '@playwright/test';

const externalFontHost = /fonts\.(?:googleapis|gstatic)\.com/;
const screenshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  maxDiffPixelRatio: 0.005,
};

for (const locale of ['ru', 'en'] as const) {
  test(`local fonts render ${locale.toUpperCase()} without external requests or layout shift`, async ({ page }) => {
    const requestedUrls: string[] = [];
    await page.addInitScript((language) => {
      localStorage.setItem('vilu_language', language);
      (window as typeof window & { __viluLayoutShift: number }).__viluLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) (window as typeof window & { __viluLayoutShift: number }).__viluLayoutShift += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }, locale);
    page.on('request', (request) => requestedUrls.push(request.url()));

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);

    expect(requestedUrls.some((url) => externalFontHost.test(url))).toBe(false);
    expect(requestedUrls.some((url) => url.includes('/fonts/manrope-'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('/fonts/unbounded-'))).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('main').first()).toBeVisible();

    const families = await page.evaluate(() => {
      const displayHeading = [...document.querySelectorAll('h1, h2, h3, .font-black')]
        .find((element) => getComputedStyle(element).fontFamily.includes('Unbounded'));
      return {
        body: getComputedStyle(document.body).fontFamily,
        heading: displayHeading ? getComputedStyle(displayHeading).fontFamily : '',
        manropeLoaded: document.fonts.check('400 16px Manrope'),
        unboundedLoaded: document.fonts.check('700 32px Unbounded'),
        cls: (window as typeof window & { __viluLayoutShift: number }).__viluLayoutShift,
      };
    });
    expect(families.body).toContain('Manrope');
    expect(families.heading).toContain('Unbounded');
    expect(families.manropeLoaded).toBe(true);
    expect(families.unboundedLoaded).toBe(true);
    expect(families.cls).toBeLessThanOrEqual(0.1);

    await expect(page).toHaveScreenshot(`home-local-fonts-${locale}.png`, screenshotOptions);
  });
}

for (const locale of ['ru', 'en'] as const) {
  test(`system fallback remains usable in ${locale.toUpperCase()} when local font files fail`, async ({ page }) => {
    const requestedUrls: string[] = [];
    await page.route('**/fonts/*.woff2', (route) => route.abort('failed'));
    await page.addInitScript((language) => localStorage.setItem('vilu_language', language), locale);
    page.on('request', (request) => requestedUrls.push(request.url()));

    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(requestedUrls.some((url) => externalFontHost.test(url))).toBe(false);

    const fallback = await page.evaluate(() => {
      const displayHeading = [...document.querySelectorAll('h1, h2, h3, .font-black')]
        .find((element) => getComputedStyle(element).fontFamily.includes('Unbounded'));
      return {
        body: getComputedStyle(document.body).fontFamily,
        heading: displayHeading ? getComputedStyle(displayHeading).fontFamily : '',
        manropeLoaded: document.fonts.check('400 16px Manrope'),
        unboundedLoaded: document.fonts.check('700 32px Unbounded'),
      };
    });
    expect(fallback.body).toContain('system-ui');
    expect(fallback.heading).toContain('system-ui');
    expect(fallback.manropeLoaded).toBe(false);
    expect(fallback.unboundedLoaded).toBe(false);

    await expect(page).toHaveScreenshot(`home-font-fallback-${locale}.png`, screenshotOptions);
  });
}
