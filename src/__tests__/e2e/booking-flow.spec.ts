import { test, expect } from '@playwright/test';

test.describe('Guest booking flow', () => {
  let futureDate: string;

  test.beforeEach(async ({ page }) => {
    futureDate = await page.evaluate(() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 7);
      return d.toISOString().slice(0, 10);
    });
  });

  test('full booking flow — select date, slot, fill form, see confirmation', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1'), 'на главной должен быть заголовок "Запись на встречу"').toHaveText('Запись на встречу');

    await page.locator(`.cal-day[data-date="${futureDate}"]`).click();

    const availableSlot = page.locator('.slot-btn.available').first();
    await expect(availableSlot, 'должны быть доступные слоты').toBeVisible({ timeout: 5000 });
    await availableSlot.click();

    await expect(page.locator('#modal-overlay'), 'модалка должна открыться').toBeVisible();

    await page.locator('#modal-guest-name').fill('Иван Петров');
    await page.locator('#modal-guest-email').fill('ivan@example.com');

    await page.locator('#modal-form button[type="submit"]').click();

    await expect(page, 'должен быть редирект на страницу подтверждения').toHaveURL(/\/bookings\//, { timeout: 5000 });
    await expect(page.locator('h1'), 'заголовок страницы подтверждения').toHaveText('Вы записаны!');
    await expect(page.getByText('Иван Петров'), 'имя гостя на странице подтверждения').toBeVisible();
    await expect(page.getByText('ivan@example.com'), 'email гостя на странице подтверждения').toBeVisible();
  });

  test('occupied slot is rendered as disabled button', async ({ page, request }) => {
    const slotTime = `${futureDate}T07:00:00.000Z`;

    await request.post('/bookings', {
      form: {
        guestName: 'First',
        guestEmail: 'first@test.com',
        startTime: slotTime,
      },
    });

    await page.goto('/');
    await page.locator(`.cal-day[data-date="${futureDate}"]`).click();

    const occupiedSlot = page.locator('.slot-btn.occupied[disabled]');
    await expect(occupiedSlot.first(), 'занятый слот должен быть disabled').toBeVisible({ timeout: 5000 });
  });

  test('client-side validation shows error on empty form submit', async ({ page }) => {
    await page.goto('/');

    await page.locator(`.cal-day[data-date="${futureDate}"]`).click();

    const availableSlot = page.locator('.slot-btn.available').first();
    await expect(availableSlot, 'должны быть доступные слоты').toBeVisible({ timeout: 5000 });
    await availableSlot.click();

    await expect(page.locator('#modal-overlay'), 'модалка должна открыться').toBeVisible();

    await page.locator('#modal-form button[type="submit"]').click();

    await expect(page.locator('#modal-error'), 'ошибка валидации должна быть видна').toBeVisible();
    await expect(page.locator('#modal-error'), 'текст ошибки валидации').toHaveText('Заполните все поля');
  });

  test('modal can be closed via close button', async ({ page }) => {
    await page.goto('/');
    await page.locator(`.cal-day[data-date="${futureDate}"]`).click();
    const availableSlot = page.locator('.slot-btn.available').first();
    await expect(availableSlot, 'должны быть доступные слоты').toBeVisible({ timeout: 5000 });
    await availableSlot.click();

    await expect(page.locator('#modal-overlay'), 'модалка должна открыться').toBeVisible();
    await page.locator('#modal-close-btn').click();
    await expect(page.locator('#modal-overlay'), 'модалка должна закрыться по ×').not.toBeVisible();
  });

  test('modal can be closed via overlay click', async ({ page }) => {
    await page.goto('/');
    await page.locator(`.cal-day[data-date="${futureDate}"]`).click();
    const availableSlot = page.locator('.slot-btn.available').first();
    await expect(availableSlot, 'должны быть доступные слоты').toBeVisible({ timeout: 5000 });
    await availableSlot.click();

    await expect(page.locator('#modal-overlay'), 'модалка должна открыться').toBeVisible();
    await page.locator('#modal-overlay').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#modal-overlay'), 'модалка должна закрыться при клике вне её').not.toBeVisible();
  });

  test('modal can be closed via Escape key', async ({ page }) => {
    await page.goto('/');
    await page.locator(`.cal-day[data-date="${futureDate}"]`).click();
    const availableSlot = page.locator('.slot-btn.available').first();
    await expect(availableSlot, 'должны быть доступные слоты').toBeVisible({ timeout: 5000 });
    await availableSlot.click();

    await expect(page.locator('#modal-overlay'), 'модалка должна открыться').toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-overlay'), 'модалка должна закрыться по Escape').not.toBeVisible();
  });
});
