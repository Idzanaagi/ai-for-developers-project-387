# План проекта: Календарь бронирования

## Описание

В проекте есть две роли: владелец календаря и гости. Регистрация и авторизация отсутствуют. Владелец — один заранее заданный профиль. Гость бронирует слоты без создания аккаунта.

**Владелец календаря:**
- Просматривает страницу предстоящих встреч (список всех броней)

**Гость:**
- Открывает календарь со свободными 30-минутными слотами
- Выбирает слот и создаёт бронирование

**Правило занятости:**
- На одно и то же время нельзя создать две записи

**Окно записи по умолчанию:**
- Доступные слоты формируются на 14 дней, начиная с текущей даты
- Гость может записаться только на свободный слот из этого окна
- Сегодня: слоты только от текущего времени (округлённого вверх до 30 мин)

---

## Технологический стек

| Компонент | Выбор |
|---|---|
| Язык | TypeScript |
| Backend | Node.js + Express |
| Шаблонизатор | EJS |
| Хранилище | In-memory (Map) |
| Клиентский JS | Vanilla JS |
| Часовой пояс | UTC+3 |

---

## Структура проекта

```
project-root/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── data/
│   │   └── store.ts              # bookings: Map<string, Booking>
│   ├── services/
│   │   └── slotService.ts        # Генерация 30-мин сетки + проверка занятости
│   ├── routes/
│   │   ├── admin/
│   │   │   └── bookings.ts       # GET /admin
│   │   └── public/
│   │       ├── calendar.ts       # GET /
│   │       └── bookings.ts       # GET /api/slots, POST /bookings, GET /bookings/:id
│   ├── views/
│   │   ├── public/
│   │   │   ├── calendar/
│   │   │   │   └── index.ejs     # Календарь + date-picker + слоты
│   │   │   ├── bookings/
│   │   │   │   └── success.ejs   # Страница подтверждения
│   │   │   └── error.ejs
│   │   └── admin/
│   │       └── bookings/
│   │           └── index.ejs     # Список предстоящих встреч
│   ├── public/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── calendar.js
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── AGENTS.md
```

---

## Доменные сущности

### Slot (Слот) — виртуальная сущность

Не хранится. Генерируется на лету сервисом `slotService.ts`.

**Параметры генерации:**
- Фиксированный шаг сетки: **30 минут** (09:00, 09:30, ..., 16:30)
- Длительность каждого слота: **30 минут**
- Рабочие часы: **09:00–17:00 UTC+3**
- Окно: **14 дней**, начиная с сегодня
- Сегодня: слоты только от текущего времени (округлённого вверх до 30 мин)

```typescript
interface Slot {
  startTime: string;     // ISO "2026-05-24T09:00:00.000Z"
  endTime: string;       // ISO "2026-05-24T09:30:00.000Z"
  available: boolean;
}
```

**Проверка доступности:** слот свободен, если нет ни одной брони, пересекающейся с ним:

```typescript
const hasOverlap = Array.from(bookings.values()).some(
  b => b.startTime < slotEnd && b.endTime > slotStart
);
```

### Booking (Бронирование)

Создаётся гостем. Просматривается владельцем.

```typescript
interface Booking {
  id: string;            // UUID
  guestName: string;
  guestEmail: string;
  startTime: Date;       // Начало встречи
  endTime: Date;         // = startTime + 30 минут
  createdAt: Date;
}
```

Без статуса, без eventTypeId, без ownerId.

---

## Маршруты

### Admin

| Метод | Путь | Описание |
|---|---|---|
| GET | `/admin` | Список всех предстоящих броней (сортировка по startTime) |

### Public (гость)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/` | Календарь со свободными слотами |
| GET | `/api/slots?date=YYYY-MM-DD` | JSON: доступные слоты на дату |
| POST | `/bookings` | Создать бронирование |
| GET | `/bookings/:id` | Страница подтверждения |

---

## Публичный сценарий гостя

```
1. Guest opens GET /
   └─ Sees 14-day calendar (date picker, only today onward)
      Initially: no slots shown

2. Picks a date → JS fires GET /api/slots?date=YYYY-MM-DD
   └─ Render: available time slots as buttons, occupied ones greyed out

3. Clicks a time slot → form auto-fills time, guest enters:
      - Имя (required)
      - Email (required)
   └─ Clicks "Забронировать" → POST /bookings { guestName, guestEmail, startTime }

4. Success → redirect GET /bookings/:id
   └─ Shows: confirmation with date/time, guest name, email

5. If conflict (race) → re-render page with error: "Этот слот уже занят, выберите другой"
```

---

## Этапы реализации

| # | Этап | Описание |
|---|---|---|
| 1 | **Инициализация** | npm init, зависимости, tsconfig, AGENTS.md |
| 2 | **Типы + in-memory** | TypeScript-интерфейсы, store.ts |
| 3 | **Сервис слотов** | Генерация 30-мин сетки, проверка пересечений в памяти |
| 4 | **Public: календарь + API** | GET /, GET /api/slots, date-picker, calendar.js |
| 5 | **Public: создание брони** | POST /bookings + страница успеха |
| 6 | **Admin: список броней** | GET /admin — таблица предстоящих встреч |
| 7 | **UI + README** | Стилизация, финальная проверка |
