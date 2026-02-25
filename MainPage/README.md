# visualSITE - AI агент тестирования и наставничества

MVP: `React + Node.js(Fastify) + PostgreSQL + Gemini`.

- На нашей стороне: регистрация/вход, ответы, результаты, история, аналитика, AI-активности.
- На удаленной стороне (другой ПК): Java-сервер расписания. Наш backend забирает расписание по JSON через HTTP/TCP.

## 1. Структура

- `backend` - API + бизнес-логика + Prisma.
- `frontend` - React интерфейс.
- `tools/mock-schedule-server.mjs` - локальная имитация удаленного сервера расписания (для теста).

## 2. Быстрый запуск

```bash
# 1) поднять Postgres
docker compose up -d

# 2) установить зависимости
npm install

# 3) env-файлы
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4) применить миграции и сид
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
cd ..

# 5) запуск backend/frontend
npm run dev:backend
npm run dev:frontend
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000/api/v1`

## 3. Подключение к удаленному Java-серверу расписания

### Рекомендуемый режим: HTTP JSON

В `backend/.env`:

```env
SCHEDULE_PROVIDER_MODE=http
SCHEDULE_PROVIDER_HTTP_URL=http://<IP_ДРУГОГО_ПК>:<PORT>/api/schedule/subjects
```

Для Spring-сервера из `hacatonServer` используется `GET /api/schedule/subjects`
(без тела запроса). Ожидаемый ответ:

```json
[
  {"id":1,"subName":"Математический анализ","teacherName":"Петров П.П."},
  {"id":2,"subName":"Физика","teacherName":"Сидоров С.С."}
]
```

Также поддерживается альтернативный формат (универсальный провайдер):

```json
{"items":[{"externalScheduleId":"es_1","externalSubjectCode":"MATH101","subjectName":"Математический анализ","groupCode":"CS-101","startsAt":"2026-03-01T09:00:00Z","endsAt":"2026-03-01T10:30:00Z"}]}
```

### Режим PUSH-only (для вашей текущей сети)

Если `Node -> Java` недоступен, но `Java -> Node` доступен, используйте:

```env
SCHEDULE_PROVIDER_MODE=push
SCHEDULE_PUSH_TCP_ENABLED=true
SCHEDULE_PUSH_TCP_PORT=4100
```

В этом режиме endpoint `/subjects` читает только локальный кэш БД, который наполняется push-ом от Java.
Предупреждение про `stale` не показывается.

### Альтернатива: raw TCP JSON (NDJSON)

В `backend/.env`:

```env
SCHEDULE_PROVIDER_MODE=tcp
SCHEDULE_PROVIDER_TCP_HOST=<IP_ДРУГОГО_ПК>
SCHEDULE_PROVIDER_TCP_PORT=<PORT>
```

Запрос (1 JSON строка + `\n`):

```json
{"action":"GET_SCHEDULE","requestId":"r_1","groupCode":"CS-101","semester":"2026S1"}
```

Ответ (1 JSON строка + `\n`):

```json
{"requestId":"r_1","status":"OK","items":[{"externalScheduleId":"es_1","externalSubjectCode":"MATH101","subjectName":"Математический анализ","groupCode":"CS-101","startsAt":"2026-03-01T09:00:00Z","endsAt":"2026-03-01T10:30:00Z"}]}
```

### Обходной режим (рекомендуется при нестабильной сети): Java PUSH -> наш backend

Если backend не может стабильно дотянуться до Java (`EHOSTUNREACH`), можно включить push:

```env
SCHEDULE_PUSH_TCP_ENABLED=true
SCHEDULE_PUSH_TCP_PORT=4100
SCHEDULE_PUSH_DEFAULT_GROUP=CS-101
SCHEDULE_PUSH_DEFAULT_SEMESTER=2026S1
```

После запуска backend слушает TCP `0.0.0.0:4100` и принимает JSON-массив предметов
в формате Java `subjects` (`id/idSub`, `subName`, `teacherName`).

На Java-сервере вызов:

```bash
curl -X POST "http://<JAVA_IP>:3333/api/schedule/subjects/push?ip=<SITE_BACKEND_IP>&port=4100"
```

Пример:

```bash
curl -X POST "http://172.20.10.4:3333/api/schedule/subjects/push?ip=172.20.10.3&port=4100"
```

После push-а обновите страницу дашборда студента: предметы появятся из нашей БД.

## 4. Куда вставить Gemini API key

В `backend/.env`:

```env
GEMINI_API_KEY=<your_key>
GEMINI_MODEL=gemini-2.5-flash
```

Ключ не хранить в git (`.env` исключен через `.gitignore`).

## 5. Демо-пользователи (после seed)

- `admin@visualsite.local / Password123!`
- `teacher@visualsite.local / Password123!`
- `student@visualsite.local / Password123!`

## 6. Основные API

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- Subjects/Schedule: `/subjects`, `/schedule/items`
- Tests: `/tests/generate`, `/tests/:testId`, `/tests/:testId/submit`, `/attempts/:attemptId/result`, `/attempts/:attemptId/review`
- History: `/history/attempts`, `/history/attempts/:attemptId`
- Teacher analytics: `/teacher/analytics/summary`, `/teacher/analytics/students/:studentId`, `/teacher/analytics/weak-topics`, `/teacher/activities`
- Activities: `/activities`, `/activities/history`, `/teacher/activities/:sessionId/review`
- Admin: `/admin/users/:userId/role`, `/admin/groups`, `/admin/subject-mappings`, `/admin/audit-logs`

## 7. Локальная проверка расписания без удаленного ПК

```bash
node tools/mock-schedule-server.mjs
```

И в `.env` backend поставить:

```env
SCHEDULE_PROVIDER_MODE=http
SCHEDULE_PROVIDER_HTTP_URL=http://localhost:8080/api/schedule/subjects
```
