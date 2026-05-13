import { test, expect } from '@playwright/test';

// Один happy-path: загрузка → анонимная отправка → auth-модалка → регистрация →
// ответ стримится → видно в чате.
test('anon → register → answer streamed', async ({ page }) => {
  await page.goto('/');

  // Форсим UI без ожидания 4с видео-таймера.
  await page.evaluate(() => {
    document.getElementById('ui-container').classList.add('visible');
    document.getElementById('blur-overlay').classList.add('visible');
    localStorage.removeItem('askzakir:pendingQuestion');
  });

  const textarea = page.locator('.input-wrapper textarea');
  await textarea.fill('Что значит ислам?');

  // Cmd+Enter (Mac) / Ctrl+Enter — отправка.
  await textarea.press('Meta+Enter');

  // Должна открыться auth-модалка с greeting.
  const modal = page.locator('#auth-modal');
  await expect(modal).toHaveClass(/open/);
  await expect(page.locator('#auth-greeting')).toContainText('Ассаламу Алейкум');

  // Ждём окончания CSS-transition (0.45с) + установки autofocus (60мс) — иначе .fill
  // ловит элемент в transient-состоянии и иногда не доносит значение до .value.
  await page.waitForTimeout(600);

  // Регистрация. Кликаем перед fill, чтобы явно сфокусировать каждое поле.
  const loginInput = page.locator('#auth-login');
  const passwordInput = page.locator('#auth-password');
  await loginInput.click();
  await loginInput.fill('e2etest');
  await passwordInput.click();
  await passwordInput.fill('longpassword');
  await expect(loginInput).toHaveValue('e2etest');
  await expect(passwordInput).toHaveValue('longpassword');
  await page.locator('#auth-submit').click();

  // Модалка закрылась, в дровер-футере виден логин, чат-turn появился.
  await expect(modal).not.toHaveClass(/open/);
  await expect(page.locator('#drawer-user-login')).toHaveText('e2etest');
  await expect(page.locator('.turn')).toHaveCount(1);

  // Жмём skip thinking, ждём что аят пропадёт и появится ai-response.
  await page.locator('#btn-skip-thinking').click();
  await expect(page.locator('.ai-response.visible')).toBeVisible({ timeout: 5000 });

  // Дровер пока скрыт; кликаем по toggle — список содержит наш чат.
  await page.locator('#drawer-toggle').click();
  await expect(page.locator('.drawer-item')).toContainText('Что значит ислам?');
});
