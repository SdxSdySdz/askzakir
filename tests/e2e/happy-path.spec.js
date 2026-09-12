import { test, expect } from '@playwright/test';

// Один happy-path: landing → выбор вопроса → вход через провайдера →
// вопрос предзаполнен → ручная отправка → ответ стримится.
test('landing question → provider sign-in → manual send → answer streamed', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#landing-screen')).toBeVisible();
  const pickedQuestion = await page.locator('#landing-question-text').textContent();
  await page.locator('#landing-question-action').click();

  // Должна открыться auth-модалка с greeting.
  const modal = page.locator('#auth-modal');
  await expect(modal).toHaveClass(/open/);
  await expect(page.locator('#auth-greeting')).toContainText('Ассаламу Алейкум');

  await page.locator('[data-provider="telegram"]').click();

  // Модалка закрылась, landing спрятан, вопрос уже стоит в поле ввода.
  await expect(modal).not.toHaveClass(/open/);
  await expect(page.locator('#landing-screen')).toBeHidden();
  await expect(page.locator('#drawer-user-login')).toContainText('Telegram');
  await expect(page.locator('.input-wrapper textarea')).toHaveValue(pickedQuestion.trim());

  await page.locator('#input-send').click();
  await expect(page.locator('.turn')).toHaveCount(1);

  // Публичная dev-панель скрыта, поэтому пропускаем thinking программным click.
  await page.evaluate(() => document.getElementById('btn-skip-thinking').click());
  await expect(page.locator('.ai-response.visible')).toBeVisible({ timeout: 5000 });

  // Дровер пока скрыт; кликаем по toggle — список содержит наш чат.
  await page.locator('#drawer-toggle').click();
  await expect(page.locator('.drawer-item')).toContainText(pickedQuestion.trim());
});
