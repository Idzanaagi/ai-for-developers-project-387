import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetStore, futureDate } from './helpers.js';

const DATE = futureDate();

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/slots', () => {
  it('returns 200 with slots for valid date', async () => {
    const res = await request(app).get(`/api/slots?date=${DATE}`);

    expect(res.status, 'должен быть 200 для валидной даты').toBe(200);
    expect(res.body.date, 'дата в ответе должна совпадать с запрошенной').toBe(DATE);
    expect(Array.isArray(res.body.slots), 'slots должен быть массивом').toBe(true);
    expect(res.body.slots.length, 'должно быть 16 слотов на будущую дату').toBe(16);
  });

  it('returns 422 for invalid date format', async () => {
    const res = await request(app).get('/api/slots?date=01-07-2026');

    expect(res.status, 'должен быть 422 для неверного формата даты').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('returns 422 when date parameter is missing', async () => {
    const res = await request(app).get('/api/slots');

    expect(res.status, 'должен быть 422 при отсутствии date').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('excludes past slots for today using fake timers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T10:00:00.000Z'));

    const res = await request(app).get('/api/slots?date=2026-07-01');

    expect(res.status, 'должен быть 200').toBe(200);
    const startTimes = res.body.slots.map((s: { startTime: string }) => s.startTime);
    expect(startTimes, 'слот 09:00 MSK уже прошёл').not.toContain('2026-07-01T06:00:00.000Z');
    expect(startTimes, 'слот 13:30 MSK должен быть доступен').toContain('2026-07-01T10:30:00.000Z');
  });
});
