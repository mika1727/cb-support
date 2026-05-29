const router    = require("express").Router()
const { getDB } = require("../db/database")

// Получить сообщения по заявке
router.get("/:ticketId", (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId)
    if (isNaN(ticketId)) return res.status(400).json({ error: "Неверный ID заявки" })

    const db = getDB()

    // Проверяем что заявка существует
    const ticket = db.getTicketById(ticketId)
    if (!ticket) return res.status(404).json({ error: "Заявка не найдена" })

    const messages = db.getMessages(ticketId)
    res.json({ messages })
  } catch (err) {
    console.error("[messages GET error]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Отправить сообщение
router.post("/", (req, res) => {
  try {
    const { ticketId, senderId, senderName, senderRole, text } = req.body

    // Валидация
    if (!ticketId) return res.status(400).json({ error: "ticketId обязателен" })
    if (!text || !text.trim()) return res.status(400).json({ error: "Сообщение не может быть пустым" })
    if (text.length > 2000) return res.status(400).json({ error: "Сообщение слишком длинное (макс. 2000 символов)" })

    const validRoles = ["user", "operator", "admin"]
    if (senderRole && !validRoles.includes(senderRole)) {
      return res.status(400).json({ error: "Неверная роль отправителя" })
    }

    const db = getDB()

    // Проверяем что заявка существует
    const ticket = db.getTicketById(parseInt(ticketId))
    if (!ticket) return res.status(404).json({ error: "Заявка не найдена" })

    const message = db.insertMessage({
      ticket_id: parseInt(ticketId),
      sender_id: senderId,
      sender_name: senderName || "Аноним",
      sender_role: senderRole || "user",
      text: text.trim()
    })

    res.status(201).json({ message })
  } catch (err) {
    console.error("[messages POST error]", err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
