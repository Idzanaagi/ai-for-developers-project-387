import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import calendarRouter from './routes/public/calendar.js';
import bookingsRouter from './routes/public/bookings.js';
import adminBookingsRouter from './routes/admin/bookings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDist = path.basename(__dirname) === 'dist';
const srcPath = path.resolve(__dirname, isDist ? '../src' : '.');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(srcPath, 'views'));

app.use(express.static(path.join(srcPath, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/', calendarRouter);
app.use('/', bookingsRouter);
app.use('/', adminBookingsRouter);

app.use((_req, res) => {
  res.status(404).render('public/error', { message: 'Страница не найдена' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).render('public/error', { message: 'Внутренняя ошибка сервера' });
});

export default app;
