# IT Support Backend

Node.js + Express + Claude API + SQLite

## Структура

```
backend/
├── server.js              ← точка входа
├── package.json
├── .env.example           ← шаблон переменных окружения
├── data/
│   └── support.db         ← SQLite база (создаётся автоматически)
├── db/
│   └── database.js        ← инициализация БД, схема, seed
├── routes/
│   ├── classify.js        ← POST /api/classify-ticket
│   ├── search.js          ← GET  /api/search
│   ├── dialog.js          ← POST /api/dialog
│   ├── generate.js        ← POST /api/generate-answer
│   ├── tickets.js         ← CRUD /api/tickets
│   └── analytics.js       ← GET  /api/analytics
└── test/
    └── smoke.js           ← быстрая проверка эндпоинтов
```

## Запуск

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env файл
cp .env.example .env
# → вставить свой ANTHROPIC_API_KEY

# 3. Запустить
npm run dev        # с авто-перезапуском (nodemon)
# или
npm start          # продакшен
```

## API эндпоинты

| Метод  | Путь                      | Описание                                    |
|--------|---------------------------|---------------------------------------------|
| POST   | /api/classify-ticket      | Классификация тикета через Claude           |
| GET    | /api/search?q=текст       | Поиск по базе знаний                        |
| POST   | /api/dialog               | Диалог с ИИ (уточняющие вопросы)           |
| POST   | /api/generate-answer      | Финальный ответ с контекстом и скриншотом  |
| POST   | /api/tickets              | Создать тикет (эскалация к оператору)      |
| GET    | /api/tickets              | Список тикетов                              |
| GET    | /api/tickets/:id          | Один тикет + история диалога               |
| PATCH  | /api/tickets/:id          | Обновить статус / добавить резолюцию        |
| GET    | /api/analytics            | Метрики и статистика                        |
| GET    | /health                   | Проверка сервера                            |

## Подключение к фронтенду

В `ChatPage.jsx` замени функцию `fetchBotReply` на:

```js
async function fetchBotReply(message, sessionId, screenshot = null) {
  // 1. Поиск в базе знаний
  const searchRes = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(message)}`);
  const { results } = await searchRes.json();
  const kbContext = results.map(r => `Q: ${r.question}\nA: ${r.answer}`).join("\n\n");

  // 2. Генерация ответа
  const res = await fetch("http://localhost:3001/api/generate-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId, screenshot, kbContext }),
  });
  const data = await res.json();
  return data.answer;
}
```
