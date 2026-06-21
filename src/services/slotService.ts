import { bookings } from '../data/store.js';
import { Booking, Slot } from '../types/index.js';
import { getTimezoneOffsetMs } from '../config.js';

export const SLOT_MINUTES = 30;
export const BOOKING_WINDOW_DAYS = 14;
const WORK_START_HOUR_UTC = 6;
const WORK_END_HOUR_UTC = 14;

export function hasOverlap(bookingList: Booking[], start: Date, end: Date): boolean {
  return bookingList.some(b => b.startTime < end && b.endTime > start);
}

export function getAvailableSlots(date: string): Slot[] {
  const slots: Slot[] = [];
  const nowMs = Date.now();
  const offset = getTimezoneOffsetMs();
  const nowLocal = new Date(nowMs + offset);
  const todayLocal = nowLocal.toISOString().slice(0, 10);
  const isToday = date === todayLocal;

  const startOfDay = new Date(date + 'T00:00:00.000Z');
  if (isNaN(startOfDay.getTime())) return slots;

  const allBookings = Array.from(bookings.values());

  for (let h = WORK_START_HOUR_UTC; h < WORK_END_HOUR_UTC; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const start = new Date(startOfDay);
      start.setUTCHours(h, m, 0, 0);
      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + SLOT_MINUTES);

      if (isToday && start.getTime() <= nowMs) continue;

      slots.push({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        available: !hasOverlap(allBookings, start, end),
      });
    }
  }

  return slots;
}

export function isBookableSlot(start: Date): boolean {
  const nowMs = Date.now();
  if (start.getTime() <= nowMs) return false;

  const minutes = start.getUTCMinutes();
  if (start.getUTCSeconds() !== 0 || start.getUTCMilliseconds() !== 0) return false;
  if (minutes % SLOT_MINUTES !== 0) return false;

  const hour = start.getUTCHours();
  if (hour < WORK_START_HOUR_UTC || hour >= WORK_END_HOUR_UTC) return false;

  const offset = getTimezoneOffsetMs();
  const nowLocal = new Date(nowMs + offset);
  const startLocal = new Date(start.getTime() + offset);
  const dayMs = 24 * 3600000;
  const todayMidnightLocal = Date.UTC(
    nowLocal.getUTCFullYear(),
    nowLocal.getUTCMonth(),
    nowLocal.getUTCDate()
  );
  const startDayMidnightLocal = Date.UTC(
    startLocal.getUTCFullYear(),
    startLocal.getUTCMonth(),
    startLocal.getUTCDate()
  );
  const dayDiff = Math.round((startDayMidnightLocal - todayMidnightLocal) / dayMs);
  if (dayDiff < 0 || dayDiff >= BOOKING_WINDOW_DAYS) return false;

  return true;
}
