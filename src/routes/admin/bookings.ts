import { Router } from 'express';
import { bookings } from '../../data/store.js';

const router = Router();

router.get('/admin', (_req, res) => {
  try {
    const list = Array.from(bookings.values())
      .filter(b => b.startTime > new Date())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    res.render('admin/bookings/index', { bookings: list });
  } catch {
    res.status(500).render('public/error', { message: 'Ошибка при загрузке списка броней' });
  }
});

export default router;
