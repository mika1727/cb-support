const { getDB } = require("../db/database")

/**
 * Middleware: проверяет Bearer токен из заголовка Authorization
 * Добавляет req.user если токен валиден
 */
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "Требуется авторизация" })
  const user = getDB().getUserByToken(token)
  if (!user) return res.status(401).json({ error: "Недействительный токен" })
  req.user = user
  next()
}

/**
 * Middleware: только для операторов и администраторов
 */
function requireOperator(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "operator" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" })
    }
    next()
  })
}

/**
 * Middleware: только для администраторов
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Только для администраторов" })
    }
    next()
  })
}

module.exports = { requireAuth, requireOperator, requireAdmin }
