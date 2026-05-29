const router    = require("express").Router()
const { getDB } = require("../db/database")

// Получить всех операторов
router.get("/", (req, res) => {
  try {
    const operators = getDB().getOperators()
    res.json({ operators })
  } catch (err) {
    console.error("[operators GET]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Добавить оператора
router.post("/", (req, res) => {
  try {
    const { name, role, email, tags = [], phone, whatsapp, telegram } = req.body

    // Валидация
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Имя обязательно" })
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email обязателен" })
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Неверный формат email" })
    }

    // Проверка дубликата
    const existing = getDB().getOperators().find(o => o.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      return res.status(400).json({ error: "Специалист с таким email уже существует" })
    }

    const operator = getDB().insertOperator({
      name: name.trim(),
      role: role?.trim() || "Специалист",
      email: email.toLowerCase().trim(),
      tags: Array.isArray(tags) ? tags : [],
      phone: phone || null,
      whatsapp: whatsapp || null,
      telegram: telegram || null,
      online: false
    })

    res.status(201).json(operator)
  } catch (err) {
    console.error("[operators POST]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Обновить оператора
router.patch("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" })

    const allowed = ["online", "rating", "name", "role", "email", "tags", "phone", "whatsapp", "telegram"]
    const fields = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) fields[key] = req.body[key]
    }

    if (!Object.keys(fields).length) {
      return res.status(400).json({ error: "Нет полей для обновления" })
    }

    const ok = getDB().updateOperator(id, fields)
    if (!ok) return res.status(404).json({ error: "Специалист не найден" })

    res.json({ ok: true })
  } catch (err) {
    console.error("[operators PATCH]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Удалить оператора
router.delete("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" })

    const ok = getDB().deleteOperator(id)
    if (!ok) return res.status(404).json({ error: "Специалист не найден" })

    res.json({ ok: true })
  } catch (err) {
    console.error("[operators DELETE]", err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
