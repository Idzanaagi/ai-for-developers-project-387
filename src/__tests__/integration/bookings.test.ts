import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetStore, addBooking, futureSlotStart } from './helpers.js';

const SLOT = futureSlotStart();
const SLOT_END = new Date(new Date(SLOT).getTime() + 30 * 60000).toISOString();

beforeEach(() => {
  resetStore();
});

describe('POST /bookings', () => {
  it('creates a booking and redirects with form data', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
        startTime: SLOT,
      });

    expect(res.status, 'должен быть редирект 302').toBe(302);
    expect(res.headers.location, 'редирект должен вести на /bookings/:id').toMatch(/^\/bookings\//);
  });

  it('returns 422 when guestName is missing', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestEmail: 'ivan@test.com',
        startTime: SLOT,
      });

    expect(res.status, 'должен быть 422 при отсутствии guestName').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('returns 422 when guestEmail is missing', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        startTime: SLOT,
      });

    expect(res.status, 'должен быть 422 при отсутствии guestEmail').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('returns 422 when startTime is missing', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
      });

    expect(res.status, 'должен быть 422 при отсутствии startTime').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('returns 422 when all fields are empty', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: '',
        guestEmail: '',
        startTime: '',
      });

    expect(res.status, 'должен быть 422 при пустых полях').toBe(422);
  });

  it('returns 409 Conflict when slot is already booked', async () => {
    addBooking({
      startTime: new Date(SLOT),
      endTime: new Date(SLOT_END),
    });

    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Пётр',
        guestEmail: 'petr@test.com',
        startTime: SLOT,
      });

    expect(res.status, 'должен быть 409 при конфликте слота').toBe(409);
    expect(res.body.error, 'ошибка должна быть Conflict').toBe('Conflict');
    expect(res.body.message, 'сообщение должно содержать «уже занят»').toContain('уже занят');
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'not-an-email',
        startTime: SLOT,
      });

    expect(res.status, 'должен быть 422 при некорректном email').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('returns 422 for startTime outside working hours', async () => {
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
        startTime: `${futureSlotStart()}`.replace('T07:', 'T03:'),
      });

    expect(res.status, 'должен быть 422 для времени вне рабочих часов').toBe(422);
    expect(res.body.error, 'ошибка должна быть ValidationError').toBe('ValidationError');
  });

  it('returns 422 for startTime in the past', async () => {
    const past = new Date(Date.now() - 60 * 60000).toISOString();
    const res = await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
        startTime: past,
      });

    expect(res.status, 'должен быть 422 для прошедшего времени').toBe(422);
  });

  it('returns JSON redirect when Content-Type is application/json', async () => {
    const res = await request(app)
      .post('/bookings')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
        startTime: SLOT,
      });

    expect(res.status, 'JSON-запрос должен возвращать 200').toBe(200);
    expect(res.body.redirect, 'тело ответа должно содержать redirect URL').toMatch(/^\/bookings\//);
  });

  it('sets endTime correctly as startTime + 30 minutes', async () => {
    await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
        startTime: SLOT,
      });

    const bookings = (await import('../../data/store.js')).bookings;
    const booking = Array.from(bookings.values())[0];
    expect(booking.startTime.toISOString(), 'startTime должен совпадать с отправленным').toBe(SLOT);
    expect(booking.endTime.toISOString(), 'endTime должен быть startTime + 30 мин').toBe(SLOT_END);
  });

  it('generates UUID and stores booking in Map', async () => {
    await request(app)
      .post('/bookings')
      .type('form')
      .send({
        guestName: 'Иван',
        guestEmail: 'ivan@test.com',
        startTime: SLOT,
      });

    const bookings = (await import('../../data/store.js')).bookings;
    expect(bookings.size, 'в хранилище должна быть 1 бронь').toBe(1);
    const booking = Array.from(bookings.values())[0];
    expect(booking.id, 'должен быть сгенерирован UUID').toBeDefined();
    expect(booking.id.length, 'UUID не должен быть пустым').toBeGreaterThan(0);
    expect(booking.guestName, 'имя гостя должно сохраниться').toBe('Иван');
    expect(booking.guestEmail, 'email гостя должен сохраниться').toBe('ivan@test.com');
  });
});

describe('GET /bookings/:id', () => {
  it('renders success page with booking details', async () => {
    const id = addBooking();

    const res = await request(app).get(`/bookings/${id}`);

    expect(res.status, 'страница подтверждения должна отдавать 200').toBe(200);
    expect(res.text, 'должен содержать заголовок "Вы записаны"').toContain('Вы записаны');
    expect(res.text, 'должно отображаться имя гостя').toContain('TestUser');
    expect(res.text, 'должен отображаться email гостя').toContain('test@example.com');
  });

  it('renders 404 error page for non-existent booking', async () => {
    const res = await request(app).get('/bookings/non-existent-id');

    expect(res.status, 'должен быть 404 для несуществующей брони').toBe(404);
    expect(res.text, 'должно быть сообщение "Бронь не найдена"').toContain('Бронь не найдена');
  });
});
