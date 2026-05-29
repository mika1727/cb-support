const router    = require("express").Router()
const { getDB } = require("../db/database")

// Создать заявку
router.post("/", (req, res) => {
  try {
    const {
      userId = "anonymous",
      userName = "",
      title,
      description,
      category = "general",
      priority = "medium",
      screenshot,
      sessionId,
      operator_id
    } = req.body

    // Валидация
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Тема заявки обязательна" })
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Описание заявки обязательно" })
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "Тема слишком длинная (макс. 200 символов)" })
    }
    if (description.length > 5000) {
      return res.status(400).json({ error: "Описание слишком длинное (макс. 5000 символов)" })
    }

    const validPriorities = ["low", "medium", "high"]
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: "Неверный приоритет" })
    }

    const db = getDB()
    const ticket = db.insertTicket({
      user_id: userId,
      user_name: userName,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      screenshot: screenshot || null,
      operator_id: operator_id || null
    })

    db.logMetric("ticket_created", sessionId || null, category)
    if (sessionId) db.linkConversationsToTicket(sessionId, ticket.id)

    res.status(201).json({
      id: ticket.id,
      status: "open",
      message: "Заявка создана. Оператор свяжется в течение 2 рабочих часов."
    })
  } catch (err) {
    console.error("[tickets POST]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Получить заявки
router.get("/", (req, res) => {
  try {
    const { status, category, userId, limit = 50 } = req.query

    const parsedLimit = Math.min(parseInt(limit) || 50, 200)

    const db = getDB()
    const tickets = db.getTickets({ status, category, userId, limit: parsedLimit })
    res.json({ tickets, total: tickets.length })
  } catch (err) {
    console.error("[tickets GET]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Получить заявку по ID
router.get("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" })

    const db     = getDB()
    const ticket = db.getTicketById(id)
    if (!ticket) return res.status(404).json({ error: "Заявка не найдена" })

    const history = db.getConversations(null).filter(r => r.ticket_id === ticket.id)
    res.json({ ticket, history })
  } catch (err) {
    console.error("[tickets GET/:id]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Обновить заявку
router.patch("/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: "Неверный ID" })

    const { status, resolution, operator_id } = req.body
    const fields = {}

    const validStatuses = ["open", "in_progress", "resolved", "closed"]
    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Неверный статус" })
      }
      fields.status = status
    }
    if (resolution !== undefined) fields.resolution = resolution
    if (operator_id !== undefined) fields.operator_id = operator_id

    if (!Object.keys(fields).length) {
      return res.status(400).json({ error: "Нет полей для обновления" })
    }

    const db = getDB()
    const ok = db.updateTicket(id, fields)
    if (!ok) return res.status(404).json({ error: "Заявка не найдена" })

    if (status === "resolved") db.logMetric("ticket_resolved")

    res.json({ ok: true })
  } catch (err) {
    console.error("[tickets PATCH]", err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
