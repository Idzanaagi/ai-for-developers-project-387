import { Router } from 'express';
import { randomUUID } from 'crypto';
import { bookings } from '../../data/store.js';
import { getAvailableSlots, hasOverlap, isBookableSlot, SLOT_MINUTES } from '../../services/slotService.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

router.post('/bookings', (req, res) => {
  const { guestName, guestEmail, startTime } = req.body;

  if (!guestName || !guestEmail || !startTime) {
    return res.status(422).json({ error: 'ValidationError', message: 'Имя, email и время начала обязательны' });
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
    guestName,
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

router.get('/bookings/:id', (req, res) => {
  try {
    const booking = bookings.get(req.params.id);

    if (!booking) {
      return res.status(404).render('public/error', { message: 'Бронь не найдена' });
    }

    res.render('public/bookings/success', { booking });
  } catch {
    res.status(500).render('public/error', { message: 'Ошибка при загрузке брони' });
  }
});

export default router;
