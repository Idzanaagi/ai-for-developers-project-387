import { Router } from 'express';
import { randomUUID } from 'crypto';
import { bookings } from '../../data/store.js';
import { getAvailableSlots, hasOverlap, isBookableSlot, SLOT_MINUTES } from '../../services/slotService.js';
import { TIMEZONE } from '../../config.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 200;

let mutex: Promise<void> = Promise.resolve();

async function withMutex<T>(fn: () => T | Promise<T>): Promise<T> {
  const prev = mutex;
  let unlock!: () => void;
  mutex = new Promise<void>(resolve => { unlock = resolve; });
  await prev;
  try {
    return await Promise.resolve(fn());
  } finally {
    unlock();
  }
}

router.get('/api/slots', (req, res) => {
  const date = req.query.date as string | undefined;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(422).json({ error: 'ValidationError', message: 'Неверный или отсутствующий параметр date' });
  }

  try {
    const slots = getAvailableSlots(date);
    res.json({ date, slots });
  } catch {
    res.status(500).json({ error: 'InternalError', message: 'Ошибка при загрузке слотов' });
  }
});

router.post('/bookings', async (req, res, next) => {
  try {
    await withMutex(() => {
      const { guestName, guestEmail, startTime } = req.body;

      if (!guestName || !guestEmail || !startTime) {
        return res.status(422).json({ error: 'ValidationError', message: 'Имя, email и время начала обязательны' });
      }

      if (typeof guestName !== 'string' || guestName.trim().length === 0 || guestName.length > NAME_MAX_LENGTH) {
        return res.status(422).json({ error: 'ValidationError', message: 'Некорректная длина имени' });
      }

      if (!EMAIL_REGEX.test(guestEmail)) {
        return res.status(422).json({ error: 'ValidationError', message: 'Некорректный формат email' });
      }

      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return res.status(422).json({ error: 'ValidationError', message: 'Некорректный формат времени' });
      }

      if (!isBookableSlot(start)) {
        return res.status(422).json({ error: 'ValidationError', message: 'Недоступное время для записи' });
      }

      const end = new Date(start);
      end.setUTCMinutes(end.getUTCMinutes() + SLOT_MINUTES);

      const conflict = hasOverlap(Array.from(bookings.values()), start, end);

      if (conflict) {
        return res.status(409).json({ error: 'Conflict', message: 'Этот слот уже занят, выберите другой' });
      }

      const id = randomUUID();
      const booking = {
        id,
        guestName: guestName.trim(),
        guestEmail,
        startTime: start,
        endTime: end,
        createdAt: new Date(),
      };

      bookings.set(id, booking);

      const redirectUrl = `/bookings/${id}`;
      if (req.is('json')) {
        res.json({ redirect: redirectUrl });
      } else {
        res.redirect(redirectUrl);
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/bookings/:id', (req, res) => {
  try {
    const booking = bookings.get(req.params.id);

    if (!booking) {
      return res.status(404).render('public/error', { message: 'Бронь не найдена' });
    }

    res.render('public/bookings/success', { booking, timezone: TIMEZONE });
  } catch {
    res.status(500).render('public/error', { message: 'Ошибка при загрузке брони' });
  }
});

function cancelBooking(id: string, guestEmail: string): { error?: string } {
  const booking = bookings.get(id);
  if (!booking) {
    return { error: 'Бронь не найдена' };
  }
  if (booking.guestEmail !== guestEmail) {
    return { error: 'Email не совпадает с email брони' };
  }
  bookings.delete(id);
  return {};
}

router.delete('/bookings/:id', (req, res) => {
  const { guestEmail } = req.body;

  if (!guestEmail) {
    return res.status(422).json({ error: 'ValidationError', message: 'Email обязателен' });
  }

  const result = cancelBooking(req.params.id, guestEmail);
  if (result.error) {
    return res.status(404).json({ error: 'NotFound', message: result.error });
  }

  res.json({ success: true });
});

router.post('/bookings/:id/cancel', (req, res) => {
  const { guestEmail } = req.body;

  if (!guestEmail) {
    return res.status(422).render('public/error', { message: 'Email обязателен' });
  }

  const result = cancelBooking(req.params.id, guestEmail);
  if (result.error) {
    return res.status(404).render('public/error', { message: result.error });
  }

  res.render('public/bookings/cancelled');
});

export default router;
