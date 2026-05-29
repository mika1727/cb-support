const router = require("express").Router()
const { getDB } = require("../db/database")
const crypto = require("crypto")

// Простой rate limiter для защиты от брутфорса
const loginAttempts = new Map() // { ip: { count, resetAt } }

function checkRateLimit(ip, maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const attempts = loginAttempts.get(ip)
  if (!attempts || now > attempts.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (attempts.count >= maxAttempts) return false
  attempts.count++
  return true
}

function resetRateLimit(ip) {
  loginAttempts.delete(ip)
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "cb-support-salt").digest("hex")
}

function generateToken(userId) {
  return crypto.randomBytes(32).toString("hex")
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Регистрация
router.post("/register", (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Все поля обязательны" })
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ error: "Имя минимум 2 символа" })
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Неверный формат email" })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Пароль минимум 6 символов" })
    }

    const db = getDB()
    const existing = db.getUserByEmail(email.toLowerCase())
    if (existing) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" })
    }

    const user = db.insertUser({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashPassword(password),
      role: "user",
      provider: "local",
    })

    const token = generateToken(String(user.id))
    db.saveToken(user.id, token)

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: null }
    })
  } catch (err) {
    console.error("[auth register]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Вход
router.post("/login", (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Слишком много попыток. Подождите 15 минут." })
    }

    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: "Email и пароль обязательны" })
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Неверный формат email" })
    }

    const db = getDB()
    const user = db.getUserByEmail(email.toLowerCase())

    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" })
    }

    // Google-пользователь без пароля — только через Google
    if (user.provider === "google" && !user.password) {
      return res.status(401).json({ error: "Этот аккаунт создан через Google. Войдите через Google." })
    }

    // Google-пользователь с паролем — можно входить по email
    if (!user.password) {
      return res.status(401).json({ error: "Пароль не установлен. Войдите через Google." })
    }

    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ error: "Неверный email или пароль" })
    }

    resetRateLimit(ip)

    const token = generateToken(String(user.id))
    db.saveToken(user.id, token)

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || null }
    })
  } catch (err) {
    console.error("[auth login]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Google OAuth
router.post("/google", (req, res) => {
  try {
    const { googleId, name, email, avatar } = req.body
    if (!googleId || !email) return res.status(400).json({ error: "Отсутствуют данные Google" })
    if (!validateEmail(email)) return res.status(400).json({ error: "Неверный формат email" })

    const db = getDB()
    let user = db.getUserByEmail(email.toLowerCase())
    const isNewUser = !user

    if (!user) {
      user = db.insertUser({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: null,
        role: "user",
        provider: "google",
        googleId,
        avatar,
      })
    }

    const token = generateToken(String(user.id))
    db.saveToken(user.id, token)

    // hasPassword — есть ли у Google-пользователя дополнительный пароль
    const hasPassword = !!(user.password)

    res.json({
      token,
      isNewUser,
      hasPassword,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || avatar, provider: user.provider }
    })
  } catch (err) {
    console.error("[auth google]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Получить текущего пользователя по токену
router.get("/me", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) return res.status(401).json({ error: "Токен не передан" })

    const db = getDB()
    const user = db.getUserByToken(token)
    if (!user) return res.status(401).json({ error: "Недействительный токен" })

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, provider: user.provider, hasPassword: !!(user.password) } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Верификация кода специалиста
router.post("/operator-code", (req, res) => {
  try {
    const { userId, code, newCode } = req.body
    const MASTER_CODE = "CB-ADMIN-2026"
    const ADMIN_CODE = "ADMIN_2026"

    if (!code) return res.status(400).json({ error: "Код обязателен" })

    if (code === ADMIN_CODE) {
      return res.json({ ok: true, firstLogin: false, isAdmin: true })
    }

    const db = getDB()
    const user = db.getUserByToken(userId)
    if (!user) return res.status(404).json({ error: "Пользователь не найден" })

    const isFirstLogin = !user.operator_code || user.operator_code?.startsWith("TEMP_")
    const validCode =
      (isFirstLogin && code === MASTER_CODE) ||
      (isFirstLogin && user.operator_code === "TEMP_" + code) ||
      (!isFirstLogin && user.operator_code === hashPassword(code))

    if (!validCode) return res.status(401).json({ error: "Неверный код доступа" })

    if (newCode) {
      if (newCode.length < 4) return res.status(400).json({ error: "Код минимум 4 символа" })
      db.updateOperatorCode(user.id, hashPassword(newCode))
    }

    const operators = db.getOperators()
    const operator = operators.find(o => o.email.toLowerCase() === user.email.toLowerCase())

    res.json({ ok: true, firstLogin: isFirstLogin, operatorId: operator?.id || null })
  } catch (err) {
    console.error("[operator-code]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Смена пароля (для local-пользователей)
router.post("/change-password", (req, res) => {
  try {
    const { token, oldPassword, newPassword } = req.body
    if (!token || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Все поля обязательны" })
    }

    const db = getDB()
    const user = db.getUserByToken(token)
    if (!user) return res.status(401).json({ error: "Не авторизован" })
    if (user.provider === "google" && !user.password) return res.status(400).json({ error: "Пароль не установлен. Используйте 'Добавить пароль'." })
    if (user.password !== hashPassword(oldPassword)) return res.status(401).json({ error: "Неверный текущий пароль" })
    if (newPassword.length < 6) return res.status(400).json({ error: "Минимум 6 символов" })
    if (newPassword === oldPassword) return res.status(400).json({ error: "Новый пароль должен отличаться от старого" })

    db.updateUserPassword(user.id, hashPassword(newPassword))
    res.json({ ok: true })
  } catch (err) {
    console.error("[change-password]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Установка пароля для Google-пользователей (новый endpoint)
router.post("/set-password", (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body
    if (!token || !password) return res.status(400).json({ error: "Все поля обязательны" })
    if (password.length < 6) return res.status(400).json({ error: "Пароль минимум 6 символов" })
    if (confirmPassword && password !== confirmPassword) return res.status(400).json({ error: "Пароли не совпадают" })

    const db = getDB()
    const user = db.getUserByToken(token)
    if (!user) return res.status(401).json({ error: "Не авторизован" })
    if (user.provider !== "google") return res.status(400).json({ error: "Только для Google-аккаунтов" })
    if (user.password) return res.status(400).json({ error: "Пароль уже установлен. Используйте 'Сменить пароль'." })

    db.updateUserPassword(user.id, hashPassword(password))
    db.updateUserProvider(user.id, "google") // provider остаётся google, но password теперь есть

    res.json({ ok: true, message: "Пароль успешно установлен! Теперь вы можете входить через email и пароль." })
  } catch (err) {
    console.error("[set-password]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Сброс кода специалиста администратором
router.post("/reset-operator-code", (req, res) => {
  try {
    const { email, tempCode } = req.body
    if (!email || !tempCode) return res.status(400).json({ error: "email и tempCode обязательны" })

    const db = getDB()
    const user = db.getUserByEmail(email.toLowerCase())
    if (!user) return res.status(404).json({ error: "Пользователь не найден" })

    db.updateOperatorCode(user.id, "TEMP_" + tempCode)
    res.json({ ok: true })
  } catch (err) {
    console.error("[reset-operator-code]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Получить всех пользователей
router.get("/users", (req, res) => {
  try {
    const db = getDB()
    const users = db.getAllUsers()
    res.json({
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        provider: u.provider,
        hasPassword: !!(u.password),
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Сброс пароля сотрудника администратором
router.post("/reset-user-password", (req, res) => {
  try {
    const { email, tempPassword } = req.body
    if (!email || !tempPassword) return res.status(400).json({ error: "email и tempPassword обязательны" })

    const db = getDB()
    const user = db.getUserByEmail(email.toLowerCase())
    if (!user) return res.status(404).json({ error: "Пользователь не найден" })
    // Google без пароля — нельзя сбросить
    if (user.provider === "google" && !user.password) return res.status(400).json({ error: "Google аккаунт без пароля — сброс невозможен" })

    db.updateUserPassword(user.id, hashPassword(tempPassword))
    res.json({ ok: true })
  } catch (err) {
    console.error("[reset-user-password]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Запрос на сброс пароля от сотрудника
router.post("/request-password-reset", (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: "Email обязателен" })
    if (!validateEmail(email)) return res.status(400).json({ error: "Неверный формат email" })

    const db = getDB()
    const user = db.getUserByEmail(email.toLowerCase())
    if (!user) return res.status(404).json({ error: "Пользователь не найден" })
    if (user.provider === "google" && !user.password) return res.status(400).json({ error: "Войдите через Google" })

    db.insertPasswordReset({ email: email.toLowerCase(), name: user.name })
    res.json({ ok: true })
  } catch (err) {
    console.error("[request-password-reset]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Получить запросы на сброс пароля
router.get("/password-resets", (req, res) => {
  try {
    const resets = getDB().getPasswordResets()
    res.json({ resets })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Выполнить сброс пароля
router.post("/resolve-password-reset", (req, res) => {
  try {
    const { id, email, tempPassword } = req.body
    if (!id || !email || !tempPassword) {
      return res.status(400).json({ error: "id, email и tempPassword обязательны" })
    }

    const db = getDB()
    const user = db.getUserByEmail(email.toLowerCase())
    if (!user) return res.status(404).json({ error: "Пользователь не найден" })

    db.updateUserPassword(user.id, hashPassword(tempPassword))
    db.resolvePasswordReset(id)
    res.json({ ok: true })
  } catch (err) {
    console.error("[resolve-password-reset]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Статистика заявок для администратора
router.get("/stats", (req, res) => {
  try {
    const db = getDB()
    const tickets = db.getAllTickets ? db.getAllTickets() : []

    const now = new Date()
    const days = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: key, count: 0 })
    }
    tickets.forEach(t => {
      const key = (t.created_at || "").slice(0, 10)
      const day = days.find(d => d.date === key)
      if (day) day.count++
    })

    const byCategory = {}
    const byStatus   = {}
    const byPriority = {}
    let totalResolutionMs = 0
    let resolvedCount = 0

    tickets.forEach(t => {
      byCategory[t.category || "Другое"] = (byCategory[t.category || "Другое"] || 0) + 1
      byStatus[t.status || "open"]       = (byStatus[t.status || "open"] || 0) + 1
      byPriority[t.priority || "medium"] = (byPriority[t.priority || "medium"] || 0) + 1
      if ((t.status === "resolved" || t.status === "closed") && t.created_at && t.updated_at) {
        totalResolutionMs += new Date(t.updated_at) - new Date(t.created_at)
        resolvedCount++
      }
    })

    const avgResolutionHours = resolvedCount > 0
      ? Math.round(totalResolutionMs / resolvedCount / 3600000 * 10) / 10
      : null

    res.json({
      byDay: days,
      byCategory: Object.entries(byCategory).map(([k, v]) => ({ name: k, count: v })).sort((a, b) => b.count - a.count),
      byStatus:   Object.entries(byStatus).map(([k, v]) => ({ name: k, count: v })),
      byPriority: Object.entries(byPriority).map(([k, v]) => ({ name: k, count: v })),
      avgResolutionHours,
      total: tickets.length,
    })
  } catch (err) {
    console.error("[stats]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Выход (инвалидация токена)
router.post("/logout", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) return res.status(400).json({ error: "Токен не передан" })

    const db = getDB()
    db.deleteToken(token)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
