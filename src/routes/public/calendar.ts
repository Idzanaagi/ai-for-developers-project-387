import { Router } from 'express';
import { UTC_OFFSET, BOOKING_WINDOW_DAYS } from '../../services/slotService.js';

const router = Router();

router.get('/', (_req, res) => {
  const nowUTC3 = new Date(Date.now() + UTC_OFFSET);
  const today = nowUTC3.toISOString().slice(0, 10);

  const dates: string[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const d = new Date(nowUTC3);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  res.render('public/calendar/index', { today, dates });
});

export default router;
