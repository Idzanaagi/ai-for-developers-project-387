import { bookings } from '../../data/store.js';

const UTC_OFFSET = 3 * 3600000;

export function futureDate(daysAhead = 7): string {
  const nowUTC3 = new Date(Date.now() + UTC_OFFSET);
  nowUTC3.setUTCDate(nowUTC3.getUTCDate() + daysAhead);
  return nowUTC3.toISOString().slice(0, 10);
}

export function futureSlotStart(daysAhead = 7, hourUTC = 7): string {
  return `${futureDate(daysAhead)}T${String(hourUTC).padStart(2, '0')}:00:00.000Z`;
}

export function resetStore(): void {
  bookings.clear();
}

export function addBooking(overrides: Partial<{
  id: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}> = {}): string {
  const id = overrides.id ?? 'test-id';
  const booking = {
    id,
    guestName: overrides.guestName ?? 'TestUser',
    guestEmail: overrides.guestEmail ?? 'test@example.com',
    startTime: overrides.startTime ?? new Date('2026-07-01T07:00:00.000Z'),
    endTime: overrides.endTime ?? new Date('2026-07-01T07:30:00.000Z'),
    createdAt: overrides.createdAt ?? new Date(),
  };
  bookings.set(id, booking);
  return id;
}
