import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetStore } from './helpers.js';

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /', () => {
  it('renders calendar with 14 dates starting from today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T09:00:00.000Z'));

    const res = await request(app).get('/');

    expect(res.status, 'главная должна отдавать 200').toBe(200);
    expect(res.text, 'должен быть заголовок "Запись на встречу"').toContain('Запись на встречу');

    const match = res.text.match(/data-date="([^"]+)"/g);
    expect(match, 'должно быть 14 дат в календаре').toHaveLength(14);

    vi.useRealTimers();
  });

  it('includes today in the date list', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T09:00:00.000Z'));

    const res = await request(app).get('/');

    expect(res.text, 'сегодняшняя дата должна быть в списке').toContain('data-date="2026-07-15"');

    vi.useRealTimers();
  });
});
