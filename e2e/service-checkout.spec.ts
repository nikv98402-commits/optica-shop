import { expect, test } from '@playwright/test';

for (const locale of ['ru', 'en'] as const) {
  test(`${locale}: checkout keeps content inside the viewport`, async ({ page }) => {
    await page.addInitScript((language) => {
      localStorage.setItem('vilu_language', language);
      localStorage.setItem('vilu_service_checkout_draft_v1', JSON.stringify({
        version: 1,
        sourcePage: '/products',
        selectedFrames: [{
          frameId: 'aurora',
          frameName: 'Aurora Crystal with a deliberately long accessible frame name',
          frameBrand: 'ViLu',
        }],
        storePreference: { mode: 'later' },
        createdAt: new Date().toISOString(),
      }));
    }, locale);
    await page.goto('/checkout');

    await expect(page.getByRole('heading', {
      name: locale === 'ru' ? 'Ваш подбор для салона' : 'Your in-store shortlist',
    })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
}
