# CB-Support

IT helpdesk с ИИ-чатом, живыми операторами и историей обращений.

## Структура

```
cb-support/
├── backend/          # Node.js + Express + Groq + lowdb
│   ├── routes/       # API маршруты
│   ├── db/           # JSON-база данных (lowdb)
│   └── server.js     # Точка входа
├── frontend/         # React + Vite + Tailwind
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── ChatPage.jsx
│           ├── OperatorPage.jsx
│           └── HistoryPage.jsx
├── .env.example      # Шаблон переменных окружения
└── package.json      # Корневой (скрипты для запуска)
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm run install:all
```

### 2. Настройка окружения

```bash
cp .env.example .env
# Вставьте GROQ_API_KEY из https://console.groq.com
```

### 3. Разработка (два сервера)

```bash
npm run dev
# Бэкенд:  http://localhost:3001
# Фронтенд: http://localhost:5173
```

### 4. Продакшн (один сервер)

```bash
npm run build                         # Собирает React в frontend/dist
NODE_ENV=production npm start         # Express раздаёт и API и фронт
# Открыть: http://localhost:3001
```

## API Endpoints

| Метод | Путь | Назначение |
|-------|------|------------|
| POST | `/api/classify-ticket` | Классификация тикета (Groq) |
| GET  | `/api/search` | Поиск по базе знаний |
| POST | `/api/dialog` | Уточняющие вопросы ИИ |
| POST | `/api/generate-answer` | Финальный ответ Claude |
| CRUD | `/api/tickets` | Управление тикетами |
| GET  | `/api/analytics` | Метрики и аналитика |
| GET  | `/health` | Проверка работы сервера |
