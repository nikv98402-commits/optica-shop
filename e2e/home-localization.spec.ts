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
  await expect(page.getByRole('region', { name: 'Спросить ViLu' })).toBeVisible({ timeout: 15_000 });
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

test('header controls, dead store navigation, and auth labels stay accessible in RU and EN', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';

  if (mobile) {
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await expect(page.getByRole('button', { name: 'Наши салоны' })).toHaveCount(0);
    const profile = page.getByRole('button', { name: 'Личный кабинет' });
    await profile.focus();
    await page.keyboard.press('Enter');
  } else {
    await expect(page.getByRole('button', { name: 'Салоны' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Открыть корзину' })).toBeVisible();
    const profile = page.getByRole('button', { name: 'Открыть личный кабинет' });
    await profile.focus();
    await page.keyboard.press('Enter');
  }

  await expect(page).toHaveURL(/\/dashboard$/);
  const russianTrigger = page.getByRole('button', { name: 'Создать защищённый аккаунт' });
  await russianTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Регистрация' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Электронная почта' })).toBeFocused();
  const russianDialog = page.getByRole('dialog', { name: 'Регистрация' });
  const russianFocusable = russianDialog.locator('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
  await russianFocusable.first().focus();
  await page.keyboard.press('Shift+Tab');
  await expect(russianFocusable.last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(russianFocusable.first()).toBeFocused();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(russianTrigger).toBeFocused();

  await russianTrigger.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Регистрация' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Регистрация' })).toHaveCount(0);
  await expect(russianTrigger).toBeFocused();

  await page.goto('/');
  if (mobile) {
    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await page.getByRole('button', { name: 'Язык: EN' }).click();
    await expect(page.getByRole('button', { name: 'Our stores' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Profile', exact: true }).focus();
  } else {
    await page.getByRole('button', { name: 'Переключить язык на EN' }).click();
    await expect(page.getByRole('button', { name: 'Stores' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open cart' })).toBeVisible();
    await page.getByRole('button', { name: 'Open profile' }).focus();
  }
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/dashboard$/);
  const englishTrigger = page.getByRole('button', { name: 'Create secure account' });
  await englishTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Create Account' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email Address' })).toBeFocused();
  await expect.poll(() => languageSurface(page)).not.toMatch(/[А-Яа-яЁё]/);
  const englishDialog = page.getByRole('dialog', { name: 'Create Account' });
  const englishFocusable = englishDialog.locator('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
  await englishFocusable.first().focus();
  await page.keyboard.press('Shift+Tab');
  await expect(englishFocusable.last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(englishFocusable.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Create Account' })).toHaveCount(0);
  await expect(englishTrigger).toBeFocused();
});
