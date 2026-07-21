import { expect, test } from '@playwright/test';

const supportedResponse = {
  answerId: 'answer-e2e', answer: '52 — ширина линзы. [1]', confidence: 'supported', safety: 'informational',
  citations: [{ id: 'source-e2e', title: 'Как выбрать размер оправы', url: 'https://vilu.store/kak-vybrat-razmer-opravy', publisher: 'ViLu', license: 'vilu-owned' }],
  relatedPaths: ['/kak-vybrat-razmer-opravy'],
};

const unsupportedResponse = {
  answerId: 'answer-unsupported',
  answer: 'В проверенных материалах ViLu пока нет надежного ответа.',
  confidence: 'insufficient_sources',
  safety: 'informational',
  citations: [],
  relatedPaths: ['/vision-care'],
};

const urgentResponse = {
  answerId: 'answer-urgent',
  answer: 'Не откладывайте очную медицинскую помощь.',
  confidence: 'insufficient_sources',
  safety: 'urgent',
  citations: [],
  relatedPaths: ['/vision-care'],
};

test.beforeEach(async ({ page }) => {
  let transientAttempts = 0;
  await page.route('**/functions/v1/knowledge-assistant', async (route) => {
    const query = ((route.request().postDataJSON() as { query?: string } | null)?.query || '').toLowerCase();
    if (query.includes('ошибка')) {
      transientAttempts += 1;
      if (transientAttempts === 1) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'retrieval_unavailable' }) });
        return;
      }
    }
    const body = query.includes('неизвест')
      ? unsupportedResponse
      : query.includes('внезап')
        ? urgentResponse
        : supportedResponse;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
});

test('RU assistant answers and exposes its source', async ({ page }) => {
  await page.goto('/assistant');
  const form = page.getByTestId('assistant-form');
  await form.getByRole('textbox').fill('Что значит 52-18-140?');
  await form.getByRole('button', { name: 'Спросить', exact: true }).click();
  await expect(page.getByText('52 — ширина линзы. [1]')).toBeVisible();
  await page.getByRole('button', { name: /Источники/i }).click();
  await expect(page.getByRole('link', { name: /Как выбрать размер оправы/i })).toBeVisible();
});

test('English preference translates the complete assistant shell', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vilu_language', 'en'));
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: 'Ask ViLu about vision and choosing frames' })).toBeVisible();
  await expect(page.getByTestId('assistant-form').getByRole('button', { name: 'Ask', exact: true })).toBeDisabled();
  await expect(page.getByText('History and preferences stay only in your browser.')).toBeVisible();
  await page.getByRole('textbox').fill('What does 52-18-140 mean?');
  await page.getByTestId('assistant-form').getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByText('52 — ширина линзы. [1]')).toBeVisible();
});

test('unsupported question shows a safe abstention and related material', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('textbox').fill('Неизвестный вопрос без источника');
  await page.getByRole('button', { name: 'Спросить', exact: true }).click();
  await expect(page.getByText('В проверенных материалах ViLu пока нет надежного ответа.')).toBeVisible();
  await expect(page.getByRole('button', { name: /vision care/i })).toBeVisible();
});

test('urgent wording produces prominent in-person guidance', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('textbox').fill('Внезапная потеря зрения');
  await page.getByRole('button', { name: 'Спросить', exact: true }).click();
  await expect(page.getByText('Лучше обратиться за очной помощью')).toBeVisible();
  await expect(page.getByText('Не откладывайте очную медицинскую помощь.')).toBeVisible();
});

test('transient backend error can be retried without retyping', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('textbox').fill('Ошибка источника');
  await page.getByRole('button', { name: 'Спросить', exact: true }).click();
  await expect(page.getByText(/Не удалось получить ответ/)).toBeVisible();
  await page.getByRole('button', { name: 'Повторить' }).click();
  await expect(page.getByText('52 — ширина линзы. [1]')).toBeVisible();
});

test('related material navigation stays inside ViLu', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('textbox').fill('Что значит 52-18-140?');
  await page.getByRole('button', { name: 'Спросить', exact: true }).click();
  await page.getByRole('button', { name: /kak vybrat razmer opravy/i }).click();
  await expect(page).toHaveURL(/\/kak-vybrat-razmer-opravy$/);
});

test('local conversation survives reload and can still be removed', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('textbox').fill('Что значит 52-18-140?');
  await page.getByRole('button', { name: 'Спросить', exact: true }).click();
  await expect(page.getByText('52 — ширина линзы. [1]')).toBeVisible();
  await page.reload();
  await expect(page.getByText('52 — ширина линзы. [1]')).toBeVisible();
  await page.getByRole('button', { name: /Очистить историю/i }).click();
  await expect(page.getByText('Выберите подсказку или задайте свой вопрос.')).toBeVisible();
});

test('suggested prompt submits and history can be cleared', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('button', { name: 'Что такое PD?' }).click();
  await page.getByTestId('assistant-form').getByRole('button', { name: 'Спросить', exact: true }).click();
  await expect(page.getByText('52 — ширина линзы. [1]')).toBeVisible();
  await page.getByRole('button', { name: /Очистить историю/i }).click();
  await expect(page.getByText('Выберите подсказку или задайте свой вопрос.')).toBeVisible();
});

test('assistant has no horizontal overflow and keeps controls reachable', async ({ page }) => {
  await page.goto('/assistant');
  const dimensions = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /Настроить ответы/i })).toBeVisible();
});
