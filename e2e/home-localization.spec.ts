import { expect, test } from '@playwright/test';

async function languageSurface(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const attributes = Array.from(document.querySelectorAll('[aria-label], [title], [placeholder]'))
      .flatMap((element) => ['aria-label', 'title', 'placeholder'].map((name) => element.getAttribute(name) ?? ''));
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '';
    return [document.body.textContent ?? '', document.title, description, ...attributes].join(' ');
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vilu_language', 'ru'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('Home and Ask ViLu stay localized through RU to EN to RU', async ({ page }, testInfo) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('.compact-assistant__suggestions')).toHaveAttribute('aria-label', 'Подсказки');
  await expect(page.getByRole('button', { name: 'Добавить материал' })).toBeVisible();
  await expect(page.getByPlaceholder('Задайте вопрос о зрении или выборе оправы')).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await page.getByRole('button', { name: 'Язык: EN' }).click();
  } else {
    await page.getByRole('button', { name: 'Переключить язык на EN' }).click();
  }

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.compact-assistant__suggestions')).toHaveAttribute('aria-label', 'Suggestions');
  await expect(page.getByRole('button', { name: 'Add material' })).toBeVisible();
  await expect(page.getByPlaceholder('Ask about vision or choosing frames')).toBeVisible();
  await expect.poll(() => languageSurface(page)).not.toMatch(/[А-Яа-яЁё]/);

  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Language: RU' }).click();
  } else {
    await page.getByRole('button', { name: 'Switch language to RU' }).click();
  }

  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('.compact-assistant__suggestions')).toHaveAttribute('aria-label', 'Подсказки');
  await expect(page.getByPlaceholder('Задайте вопрос о зрении или выборе оправы')).toBeVisible();
});
