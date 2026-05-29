const router  = require("express").Router();
const Groq    = require("groq-sdk");
const { getDB } = require("../db/database");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM = `Ты — классификатор тикетов корпоративной IT-поддержки.
Получаешь описание проблемы и возвращаешь ТОЛЬКО JSON без пояснений.
Поля: category ("vpn"|"excel"|"password"|"hardware"|"software"|"network"|"other"),
priority ("low"|"medium"|"high"|"critical"), type ("incident"|"request"|"question"),
summary (1 предложение на русском), confidence (0–1).`;

router.post("/", async (req, res) => {
  try {
    const { text, sessionId } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    const msg = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system",  content: SYSTEM },
        { role: "user",    content: text },
      ],
      max_tokens: 256,
    });

    const raw    = msg.choices[0].message.content.replace(/```json|```/g, "").trim();
    const result = JSON.parse(raw);
    getDB().logMetric("ticket_classified", sessionId || null, result.category);
    res.json(result);
  } catch (err) {
    console.error("[classify]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
