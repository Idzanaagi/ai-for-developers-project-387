import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAvailableSlots } from '../../services/slotService.js';
import { resetStore, addBooking } from '../integration/helpers.js';

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getAvailableSlots', () => {
  it('returns 16 slots for a future date with no bookings', () => {
    const slots = getAvailableSlots('2026-07-01');

    expect(slots,  'должно быть 16 слотов 09:00–16:30 MSK').toHaveLength(16);
    slots.forEach(s => {
      expect(s.available, 'все слоты должны быть свободны').toBe(true);
    });
  });

  it('marks overlapping slot as unavailable', () => {
    addBooking({
      startTime: new Date('2026-07-01T07:00:00.000Z'),
      endTime: new Date('2026-07-01T07:30:00.000Z'),
    });

    const slots = getAvailableSlots('2026-07-01');

    const slot = slots.find(s => s.startTime === '2026-07-01T07:00:00.000Z');
    expect(slot, 'слот 10:00 должен присутствовать в сетке').toBeDefined();
    expect(slot!.available, 'слот 10:00 должен быть занят').toBe(false);
  });

  it('leaves non-overlapping adjacent slot before booking as available', () => {
    addBooking({
      startTime: new Date('2026-07-01T07:00:00.000Z'),
      endTime: new Date('2026-07-01T07:30:00.000Z'),
    });

    const slots = getAvailableSlots('2026-07-01');

    const slot = slots.find(s => s.startTime === '2026-07-01T06:30:00.000Z');
    expect(slot, 'слот 09:30 должен присутствовать в сетке').toBeDefined();
    expect(slot!.available, 'слот 09:30 (до брони) должен быть свободен').toBe(true);
  });

  it('leaves non-overlapping adjacent slot after booking as available', () => {
    addBooking({
      startTime: new Date('2026-07-01T07:00:00.000Z'),
      endTime: new Date('2026-07-01T07:30:00.000Z'),
    });

    const slots = getAvailableSlots('2026-07-01');

    const slot = slots.find(s => s.startTime === '2026-07-01T07:30:00.000Z');
    expect(slot, 'слот 10:30 должен присутствовать в сетке').toBeDefined();
    expect(slot!.available, 'слот 10:30 (после брони) должен быть свободен').toBe(true);
  });

  it('filters past slots for today using fake timers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T08:30:00.000Z'));

    const slots = getAvailableSlots('2026-07-01');

    const pastSlot = slots.find(s => s.startTime === '2026-07-01T06:00:00.000Z');
    expect(pastSlot, 'слот 09:00 (уже прошёл) не должен присутствовать').toBeUndefined();

    const futureSlot = slots.find(s => s.startTime === '2026-07-01T09:00:00.000Z');
    expect(futureSlot, 'слот 12:00 (ещё не наступил) должен присутствовать').toBeDefined();
    expect(futureSlot!.available, 'слот 12:00 должен быть свободен').toBe(true);
  });

  it('marks multiple slots as unavailable with multiple overlapping bookings', () => {
    addBooking({
      startTime: new Date('2026-07-01T07:00:00.000Z'),
      endTime: new Date('2026-07-01T07:30:00.000Z'),
    });
    addBooking({
      id: 'test-id-2',
      startTime: new Date('2026-07-01T10:00:00.000Z'),
      endTime: new Date('2026-07-01T10:30:00.000Z'),
    });

    const slots = getAvailableSlots('2026-07-01');

    expect(slots.find(s => s.startTime === '2026-07-01T07:00:00.000Z')!.available, 'слот 10:00 должен быть занят').toBe(false);
    expect(slots.find(s => s.startTime === '2026-07-01T10:00:00.000Z')!.available, 'слот 13:00 должен быть занят').toBe(false);
    expect(slots.find(s => s.startTime === '2026-07-01T09:00:00.000Z')!.available, 'слот 12:00 (без брони) должен быть свободен').toBe(true);
  });

  it('returns correct ISO strings with UTC+3 offset (09:00 MSK = 06:00 UTC)', () => {
    const slots = getAvailableSlots('2026-07-01');

    const firstSlot = slots[0];
    expect(firstSlot.startTime, 'первый слот 09:00 MSK = 06:00 UTC').toBe('2026-07-01T06:00:00.000Z');
    expect(firstSlot.endTime, 'конец первого слота 06:30 UTC').toBe('2026-07-01T06:30:00.000Z');

    const lastSlot = slots[slots.length - 1];
    expect(lastSlot.startTime, 'последний слот 16:30 MSK = 13:30 UTC').toBe('2026-07-01T13:30:00.000Z');
    expect(lastSlot.endTime, 'конец последнего слота 14:00 UTC').toBe('2026-07-01T14:00:00.000Z');
  });
});
