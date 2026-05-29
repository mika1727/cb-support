const router = require("express").Router();
const { getDB } = require("../db/database");

const SYSTEM = `Ты — опытный IT-специалист технической поддержки. Веди диалог как настоящий специалист:

ЭТАП 1 — ДИАГНОСТИКА (первые 2-3 сообщения):
Когда пользователь описал проблему — задавай по ОДНОМУ уточняющему вопросу за раз.
Вопрос должен быть коротким (1 предложение) и содержать 2-3 варианта ответа ПРОНУМЕРОВАННЫХ ЦИФРАМИ.
Примеры:
"Интернет на устройстве работает?
1. Да
2. Нет
3. Не знаю"

ЭТАП 2 — РЕШЕНИЕ:
После уточнений дай чёткое пошаговое решение. Объясняй понятно.

Если пользователь прислал изображение — внимательно изучи его и опиши что видишь, что не так, и как это исправить.

ЭТАП 3 — ЭСКАЛАЦИЯ (только если ничего не помогло):
Напиши ТОЛЬКО: "К сожалению, я не смог решить вашу проблему."

ВАЖНО:
- Варианты ответа ВСЕГДА нумеруй цифрами: 1. 2. 3.
- Задавай только ОДИН вопрос за раз
- Не предлагай обратиться в поддержку до этапа 3
- Отвечай на языке пользователя`;

function parseRetryMessage(errMessage) {
  try {
    const errData = JSON.parse(errMessage)
    if (errData?.error?.code === 429) {
      const retryInfo = errData?.error?.details?.find(d => d["@type"]?.includes("RetryInfo"))
      const retryDelay = retryInfo?.retryDelay || "несколько минут"
      const seconds = parseInt(retryDelay)
      let waitMsg = retryDelay
      if (!isNaN(seconds)) {
        const mins = Math.ceil(seconds / 60)
        waitMsg = mins > 1 ? `${mins} минут` : `${seconds} секунд`
      }
      return `⏳ ИИ временно недоступен — превышен лимит запросов.\n\nПопробуйте через ${waitMsg}. Пока можете описать проблему текстом.`
    }
  } catch {}
  return null
}

async function askGemini(prompt, parts) {
  const contents = parts
    ? [{ parts }]
    : [{ parts: [{ text: prompt }] }]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  )
  const data = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(data))
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Нет ответа."
}

router.post("/", async (req, res) => {
  try {
    const {
      sessionId = `s_${Date.now()}`,
      userId = "anonymous",
      message,
      history = [],
      kbContext = "",
      imageBase64,
      imageMimeType
    } = req.body

    if (!message && !imageBase64) {
      return res.status(400).json({ error: "message or image is required" })
    }

    const db = getDB()
    let reply

    if (imageBase64) {
      // Анализ изображения через Gemini
      try {
        const parts = []
        parts.push({ inline_data: { mime_type: imageMimeType || "image/png", data: imageBase64 } })
        parts.push({ text: `${SYSTEM}\n\nПользователь: ${message || "Посмотри на это изображение и помоги разобраться с проблемой."}` })
        reply = await askGemini(null, parts)
      } catch (geminiErr) {
        console.error("[gemini image]", geminiErr.message)
        const rateLimitMsg = parseRetryMessage(geminiErr.message)
        reply = rateLimitMsg || "⚠️ Не удалось проанализировать изображение. Попробуйте описать проблему текстом."
      }
    } else {
      // Текстовый диалог через Gemini
      try {
        const historyText = history
          .map(h => `${h.role === "user" ? "Пользователь" : "Ассистент"}: ${h.content}`)
          .join("\n")
        const fullPrompt = `${SYSTEM}${kbContext ? `\n\nБаза знаний:\n${kbContext}` : ""}${historyText ? `\n\n${historyText}` : ""}\n\nПользователь: ${message}\n\nАссистент:`
        reply = await askGemini(fullPrompt)
      } catch (geminiErr) {
        console.error("[gemini text]", geminiErr.message)
        const rateLimitMsg = parseRetryMessage(geminiErr.message)
        if (rateLimitMsg) {
          return res.json({ reply: rateLimitMsg, options: [], sessionId, suggestEscalate: false })
        }
        throw geminiErr
      }
    }

    // Парсим варианты ответа
    const lines = reply.split("\n").map(l => l.trim()).filter(Boolean)
    const optionLines = lines.filter(l => /^(\d+[.)]\s+|-\s+).{2,50}$/.test(l))
    const options = optionLines.map(l => l.replace(/^(\d+[.)]\s*|-\s*)/, "").trim()).slice(0, 4)
    let replyText = reply
    if (options.length >= 2) {
      replyText = lines
        .filter(l => !/^(\d+[.)]\s+|-\s+).+/.test(l))
        .filter(l => !/^варианты/i.test(l))
        .join("\n")
        .trim()
    }

    const suggestEscalate = replyText.includes("К сожалению, я не смог решить")

    db.insertConversation({ session_id: sessionId, user_id: userId, role: "user", content: message || "[изображение]" })
    db.insertConversation({ session_id: sessionId, user_id: userId, role: "assistant", content: replyText })
    db.logMetric("message_sent", sessionId)

    res.json({ reply: replyText, options, sessionId, suggestEscalate })
  } catch (err) {
    console.error("[dialog]", err.message)
    const rateLimitMsg = parseRetryMessage(err.message)
    if (rateLimitMsg) {
      return res.json({ reply: rateLimitMsg, options: [], sessionId: req.body.sessionId, suggestEscalate: false })
    }
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
