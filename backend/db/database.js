/**
 * db/database.js
 * Использует lowdb — JSON-файл, чистый JS, не требует компиляции.
 * Работает на Windows/Mac/Linux без Python и node-gyp.
 */
const { Low } = require("lowdb")
const { JSONFile } = require("lowdb/node")
const path = require("path")
const fs   = require("fs")

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../data/support.db.json")

let _db

function nextId(table) {
  const rows = _db.data[table]
  if (!rows || rows.length === 0) return 1
  return Math.max(...rows.map(r => r.id)) + 1
}

function now() { return new Date().toISOString() }

const dbHelpers = {
  // ── tickets ──────────────────────────────────────────────────────────────────
  insertTicket(data) {
    const row = { id: nextId("tickets"), status: "open", ...data, created_at: now(), updated_at: now() }
    _db.data.tickets.push(row)
    _db.write()
    return row
  },
  getTickets({ status, category, userId, limit = 50 } = {}) {
    let rows = _db.data.tickets
    if (status)   rows = rows.filter(r => r.status   === status)
    if (category) rows = rows.filter(r => r.category === category)
    if (userId)   rows = rows.filter(r => r.user_id  === userId)
    return [...rows].reverse().slice(0, limit)
  },
  getAllTickets() {
    return _db.data.tickets || []
  },
  getTicketById(id) {
    return _db.data.tickets.find(r => r.id === parseInt(id)) || null
  },
  updateTicket(id, fields) {
    const idx = _db.data.tickets.findIndex(r => r.id === parseInt(id))
    if (idx === -1) return false
    _db.data.tickets[idx] = { ..._db.data.tickets[idx], ...fields, updated_at: now() }
    _db.write()
    return true
  },

  // ── operators ─────────────────────────────────────────────────────────────────
  insertOperator(data) {
    const row = { id: nextId("operators"), ...data, created_at: now() }
    _db.data.operators.push(row)
    _db.write()
    return row
  },
  getOperators() { return _db.data.operators || [] },
  updateOperator(id, fields) {
    const idx = _db.data.operators.findIndex(r => r.id === parseInt(id))
    if (idx === -1) return false
    _db.data.operators[idx] = { ..._db.data.operators[idx], ...fields }
    _db.write()
    return true
  },
  deleteOperator(id) {
    const idx = _db.data.operators.findIndex(r => r.id === parseInt(id))
    if (idx === -1) return false
    _db.data.operators.splice(idx, 1)
    _db.write()
    return true
  },

  // ── users ─────────────────────────────────────────────────────────────────────
  insertUser(data) {
    const row = { id: nextId("users"), ...data, created_at: now() }
    _db.data.users.push(row)
    _db.write()
    return row
  },
  getUserByEmail(email) {
    return _db.data.users.find(r => r.email === email) || null
  },
  getUserByToken(token) {
    const t = _db.data.tokens.find(r => r.token === token)
    if (!t) return null
    return _db.data.users.find(r => r.id === t.userId) || null
  },
  getAllUsers() {
    return _db.data.users || []
  },
  updateUserPassword(userId, hashedPassword) {
    const idx = _db.data.users.findIndex(u => u.id === parseInt(userId) || u.id === userId)
    if (idx === -1) return false
    _db.data.users[idx].password = hashedPassword
    _db.write()
    return true
  },
  // Новый метод: обновить provider пользователя
  updateUserProvider(userId, provider) {
    const idx = _db.data.users.findIndex(u => u.id === parseInt(userId) || u.id === userId)
    if (idx === -1) return false
    _db.data.users[idx].provider = provider
    _db.write()
    return true
  },
  updateOperatorCode(userId, hashedCode) {
    const idx = _db.data.users.findIndex(u => u.id === parseInt(userId) || u.id === userId)
    if (idx === -1) return false
    _db.data.users[idx].operator_code = hashedCode
    _db.write()
    return true
  },

  // ── tokens ────────────────────────────────────────────────────────────────────
  saveToken(userId, token) {
    // Удаляем старые токены пользователя
    _db.data.tokens = _db.data.tokens.filter(r => r.userId !== userId)
    _db.data.tokens.push({ userId, token, created_at: now() })
    _db.write()
  },
  deleteToken(token) {
    _db.data.tokens = _db.data.tokens.filter(r => r.token !== token)
    _db.write()
  },

  // ── conversations ─────────────────────────────────────────────────────────────
  insertConversation(data) {
    const row = { id: nextId("conversations"), ...data, created_at: now() }
    _db.data.conversations.push(row)
    _db.write()
    return row
  },
  getConversations(sessionId, limit = 30) {
    return _db.data.conversations.filter(r => r.session_id === sessionId).slice(-limit)
  },
  linkConversationsToTicket(sessionId, ticketId) {
    _db.data.conversations
      .filter(r => r.session_id === sessionId && !r.ticket_id)
      .forEach(r => { r.ticket_id = ticketId })
    _db.write()
  },

  // ── messages ──────────────────────────────────────────────────────────────────
  insertMessage(data) {
    const row = { id: nextId("messages"), ...data, created_at: now() }
    _db.data.messages.push(row)
    _db.write()
    return row
  },
  getMessages(ticketId) {
    return _db.data.messages.filter(r => r.ticket_id === parseInt(ticketId))
  },

  // ── knowledge_base ────────────────────────────────────────────────────────────
  searchKB(q, category, limit = 5) {
    const ql = q.toLowerCase()
    let rows = _db.data.knowledge_base.filter(r => {
      const kw = Array.isArray(r.keywords) ? r.keywords : []
      return (
        r.question.toLowerCase().includes(ql) ||
        r.answer.toLowerCase().includes(ql) ||
        kw.some(k => k.includes(ql) || ql.includes(k))
      )
    })
    if (category) rows = rows.filter(r => r.category === category)
    return rows.map(r => {
      const kw = Array.isArray(r.keywords) ? r.keywords : []
      let score = 0
      if (r.question.toLowerCase().includes(ql)) score += 3
      if (r.answer.toLowerCase().includes(ql))   score += 1
      if (kw.some(k => k.includes(ql) || ql.includes(k))) score += 2
      return { ...r, score }
    }).sort((a, b) => b.score - a.score).slice(0, limit)
  },
  incrementKBHits(ids) {
    ids.forEach(id => {
      const r = _db.data.knowledge_base.find(r => r.id === id)
      if (r) r.hits = (r.hits || 0) + 1
    })
    _db.write()
  },

  // ── metrics ───────────────────────────────────────────────────────────────────
  logMetric(event, sessionId = null, category = null, rating = null) {
    _db.data.metrics.push({ id: nextId("metrics"), event, session_id: sessionId, category, rating, created_at: now() })
    _db.write()
  },
  getAnalytics(from, to) {
    const tickets = _db.data.tickets.filter(r => r.created_at >= from && r.created_at <= to)
    const metrics = _db.data.metrics.filter(r => r.created_at >= from && r.created_at <= to)

    const byStatus = {}, byCategory = {}
    tickets.forEach(t => {
      byStatus[t.status]     = (byStatus[t.status]     || 0) + 1
      byCategory[t.category] = (byCategory[t.category] || 0) + 1
    })

    const ratings   = metrics.filter(m => m.event === "answer_rated" && m.rating != null)
    const avgRating = ratings.length
      ? (ratings.reduce((s, m) => s + m.rating, 0) / ratings.length).toFixed(2)
      : null

    const topKB = [..._db.data.knowledge_base].sort((a, b) => (b.hits || 0) - (a.hits || 0)).slice(0, 5)

    return {
      tickets: {
        byStatus:    Object.entries(byStatus).map(([status, count]) => ({ status, count })),
        byCategory:  Object.entries(byCategory).map(([category, count]) => ({ category, count })),
        escalations: tickets.length,
      },
      messages:        { total: metrics.filter(m => m.event === "message_sent").length },
      rating:          { avg: avgRating, total: ratings.length },
      topKnowledgeBase: topKB,
    }
  },

  // ── password_resets ───────────────────────────────────────────────────────────
  insertPasswordReset(data) {
    if (!_db.data.password_resets) _db.data.password_resets = []
    const existing = _db.data.password_resets.find(r => r.email === data.email && r.status === "pending")
    if (existing) return existing
    const row = { id: nextId("password_resets"), ...data, status: "pending", created_at: now() }
    _db.data.password_resets.push(row)
    _db.write()
    return row
  },
  getPasswordResets() {
    return (_db.data.password_resets || []).filter(r => r.status === "pending")
  },
  resolvePasswordReset(id) {
    const idx = (_db.data.password_resets || []).findIndex(r => r.id === parseInt(id))
    if (idx === -1) return false
    _db.data.password_resets[idx].status = "resolved"
    _db.write()
    return true
  },
}

async function initDB() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const adapter = new JSONFile(DB_PATH)
  _db = new Low(adapter, {
    tickets:         [],
    conversations:   [],
    knowledge_base:  [],
    metrics:         [],
    operators:       [],
    users:           [],
    tokens:          [],
    messages:        [],
    password_resets: [],
  })
  await _db.read()

  // Автоматически добавляем недостающие таблицы
  const tables = ["tickets", "conversations", "knowledge_base", "metrics", "operators", "users", "tokens", "messages", "password_resets"]
  let needsWrite = false
  for (const table of tables) {
    if (!_db.data[table]) {
      _db.data[table] = []
      needsWrite = true
    }
  }
  if (needsWrite) await _db.write()

  if (_db.data.knowledge_base.length === 0) {
    _db.data.knowledge_base = [
      { id: 1, category: "vpn",      hits: 0, keywords: ["vpn", "cisco", "сеть", "подключение", "1194"],
        question: "VPN не подключается",
        answer: "1. Проверьте что токен активен в личном кабинете.\n2. Убедитесь что брандмауэр не блокирует порт 1194 (UDP).\n3. Перезапустите клиент Cisco AnyConnect.\n4. Если проблема сохраняется — обратитесь к сетевому администратору." },
      { id: 2, category: "excel",    hits: 0, keywords: ["excel", "0x800706ba", "office", "лицензия"],
        question: "Excel не запускается, ошибка 0x800706BA",
        answer: "Ошибка 0x800706BA — сбой подключения к серверу лицензий.\n1. Запустите Excel от имени администратора.\n2. Проверьте доступность корпоративного VPN.\n3. Параметры → Учётные записи → Управление → Активировать Office." },
      { id: 3, category: "password", hits: 0, keywords: ["пароль", "password", "сброс", "reset", "логин"],
        question: "Сбросить пароль",
        answer: "Для сброса пароля обратитесь к администратору через систему CB-Support." },
      { id: 4, category: "hardware", hits: 0, keywords: ["монитор", "экран", "display", "hdmi"],
        question: "Монитор не включается",
        answer: "1. Проверьте кабель питания и кабель видеосигнала.\n2. Нажмите кнопку питания на самом мониторе.\n3. Попробуйте другой порт видеокарты.\n4. Создайте заявку на замену оборудования." },
      { id: 5, category: "general",  hits: 0, keywords: ["тикет", "заявка", "поддержка", "support"],
        question: "Как создать тикет в IT-поддержку",
        answer: "Просто опишите проблему, и ИИ-ассистент поможет решить её или создаст тикет для передачи инженеру." },
    ]
    await _db.write()
    console.log("🌱  Knowledge base seeded")
  }

  console.log("📦  JSON DB ready:", DB_PATH)
}

module.exports = { initDB, getDB: () => dbHelpers }
