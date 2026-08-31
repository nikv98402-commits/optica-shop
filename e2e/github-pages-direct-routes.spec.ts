import { expect, test } from '@playwright/test';

for (const route of ['/assistant', '/dashboard', '/checkout']) {
  test(`${route} loads its static route entry directly with HTTP 200`, async ({ page }) => {
    const responses: number[] = [];
    page.on('response', (response) => {
      if (response.request().isNavigationRequest()) responses.push(response.status());
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    expect(responses).toEqual([200]);
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  });
}

for (const locale of ['ru', 'en'] as const) {
  test(`/profile returns HTTP 200 and canonicalizes to /dashboard in ${locale}`, async ({ page }) => {
    await page.addInitScript((language) => localStorage.setItem('vilu_language', language), locale);
    const responses: number[] = [];
    page.on('response', (response) => {
      if (response.request().isNavigationRequest()) responses.push(response.status());
    });

    const response = await page.goto('/profile', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    expect(responses).toEqual([200]);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
}
