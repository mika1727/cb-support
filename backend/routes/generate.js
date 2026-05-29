const router  = require("express").Router();
const Groq    = require("groq-sdk");
const { getDB } = require("../db/database");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM = `Ты — старший специалист IT-поддержки.
Дай исчерпывающий структурированный ответ:
1. Краткий диагноз проблемы
2. Пошаговое решение
3. Если не решено — как создать тикет для оператора
Отвечай на языке пользователя. Будь точен и практичен.`;

router.post("/", async (req, res) => {
  try {
    const { sessionId=`s_${Date.now()}`, message, kbContext="", history=[], rating } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    const db = getDB();
    if (rating !== undefined) db.logMetric("answer_rated", sessionId, null, rating);

    let systemPrompt = SYSTEM;
    if (kbContext) systemPrompt += `\n\nБаза знаний:\n${kbContext}`;

    const msg = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user",   content: message },
      ],
      max_tokens: 1024,
    });

    db.logMetric("answer_generated", sessionId);
    res.json({ answer: msg.choices[0].message.content });
  } catch (err) {
    console.error("[generate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
