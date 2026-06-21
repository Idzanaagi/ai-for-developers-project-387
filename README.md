### Hexlet tests and linter status:
[![Actions Status](https://github.com/Idzanaagi/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Idzanaagi/ai-for-developers-project-387/actions)

## Описание

**Calendar Booking** — сервис бронирования временных слотов. Пользователь выбирает дату и время на календаре, вводит имя и email, после чего бронь подтверждается. Администратор может просматривать список активных броней.

## Ссылки

- **Сайт**: https://ai-for-developers-project-386-lsvv.onrender.com/
- **Lighthouse отчёты**: https://idzanaagi.github.io/ai-for-developers-project-387/
- **Allure отчёты**: https://idzanaagi.github.io/ai-for-developers-project-387/allure-report/

## Стек

- **TypeScript** + **Express** — сервер
- **EJS** — шаблонизация
- **In-memory** хранилище (`Map`)
- **Vitest** + **Supertest** — unit и integration тесты
- **Playwright** — e2e тесты
- **TypeSpec** — спецификация API (генерация OpenAPI)
- **Lighthouse** — аудит производительности

## Запуск

```bash
npm ci
npx playwright install --with-deps    # только для e2e тестов
npm run dev                           # режим разработки (http://localhost:3000)
```

## Тестирование

```bash
npm test                               # unit + integration
npm run test:e2e                       # e2e тесты
npm run lighthouse                     # аудит производительности
```

## Скрипты

| Файл | Назначение |
|---|---|
| `scripts/lighthouse.mjs` | Запускает Lighthouse аудит страниц `/` и `/admin`, генерирует HTML-отчёты и index.html со сводкой |
| `scripts/lighthouse-issues.mjs` | Синхронизирует проблемы из Lighthouse отчётов с GitHub Issues |
| `npm run report:allure` | Генерирует Allure-отчёт из allure-results в allure-report/ |
| `npm run report:allure:open` | Открывает Allure-отчёт в браузере |

## Workflows

| Workflow | Триггер | Описание |
|---|---|---|
| `hexlet-check` | push (любые ветки/теги) | Проверка Hexlet |
| `lighthouse audit` | schedule, workflow_dispatch | Аудит производительности, деплой отчётов в gh-pages, синхронизация issues |
| `opencode` | comment (issue/PR) с `/oc` или `/opencode` | Запуск OpenCode-агента |
| `release-please` | push на main | Автоматические релизы и changelog |
| `tests` | pull_request в main | Запуск тестов и деплой Allure-отчёта |
| `todo-reviews` | schedule, workflow_dispatch | Поиск TODO в коде |

## Требования

- **Node.js 22+**

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт, на котором запускается приложение, необходимо передавать |

## API

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/slots?date=YYYY-MM-DD` | Получить свободные слоты на дату |
| `POST` | `/bookings` | Создать бронь (body: `guestName`, `guestEmail`, `startTime`) |
| `GET` | `/bookings/:id` | Страница подтверждения брони |
| `DELETE` | `/bookings/:id` | Отменить бронь (body: `guestEmail`) |
| `POST` | `/bookings/:id/cancel` | Отменить бронь через форму |
| `GET` | `/admin` | Список активных броней (админ-панель) |

## Production сборка

```bash
npm run build    # компиляция TypeScript в dist/
npm start        # запуск скомпилированного приложения
```

## TypeSpec

Спецификация API описана в `spec/` на языке TypeSpec.

```bash
npx tsp compile .
```

Сгенерированный OpenAPI JSON попадает в `openapi/` (игнорируется git).

## Бизнес-правила

- Окно бронирования — **14 дней** вперёд
- Длительность слота — **30 минут**
- Рабочие часы — **06:00–14:00 UTC** (UTC+3 у клиента)
- Хранилище — **in-memory** (данные теряются при перезапуске)

## Lighthouse

Аудит запускается в CI или вручную. Пороговые значения — **90%** для каждой категории (performance, accessibility, best-practices, seo). Отчёты публикуются на GitHub Pages.

## Allure

Allure-отчёты формируются после каждого прогона тестов в CI. Для локального просмотра:

```bash
npm run report:allure           # сгенерировать отчёт в allure-report/
npm run report:allure:open      # открыть в браузере (http://localhost:4000)
```

