import { Router } from 'express';
import { getTimezoneOffsetMs, TIMEZONE } from '../../config.js';
import { BOOKING_WINDOW_DAYS } from '../../services/slotService.js';

const router = Router();

router.get('/', (_req, res) => {
  const offset = getTimezoneOffsetMs();
  const nowLocal = new Date(Date.now() + offset);
  const today = nowLocal.toISOString().slice(0, 10);

  const dates: string[] = [];
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const d = new Date(nowLocal);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }

  res.render('public/calendar/index', { today, dates, timezone: TIMEZONE });
});

export default router;
