const { MongoClient, ObjectId } = require("mongodb")

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = "cbsupport"

let _client
let _db

function now() { return new Date().toISOString() }

const dbHelpers = {
  async insertTicket(data) {
    const row = { status: "open", ...data, created_at: now(), updated_at: now() }
    const result = await _db.collection("tickets").insertOne(row)
    return { ...row, id: result.insertedId.toString() }
  },
  async getTickets({ status, category, userId, limit = 50 } = {}) {
    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (userId) filter.user_id = userId
    const rows = await _db.collection("tickets").find(filter).sort({ created_at: -1 }).limit(limit).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async getAllTickets() {
    const rows = await _db.collection("tickets").find({}).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async getTicketById(id) {
    try {
      const row = await _db.collection("tickets").findOne({ _id: new ObjectId(id) })
      return row ? { ...row, id: row._id.toString() } : null
    } catch { return null }
  },
  async updateTicket(id, fields) {
    try {
      const result = await _db.collection("tickets").updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...fields, updated_at: now() } }
      )
      return result.modifiedCount > 0
    } catch { return false }
  },
  async insertOperator(data) {
    const row = { ...data, created_at: now() }
    const result = await _db.collection("operators").insertOne(row)
    return { ...row, id: result.insertedId.toString() }
  },
  async getOperators() {
    const rows = await _db.collection("operators").find({}).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async updateOperator(id, fields) {
    try {
      const result = await _db.collection("operators").updateOne(
        { _id: new ObjectId(id) },
        { $set: fields }
      )
      return result.modifiedCount > 0
    } catch { return false }
  },
  async deleteOperator(id) {
    try {
      const result = await _db.collection("operators").deleteOne({ _id: new ObjectId(id) })
      return result.deletedCount > 0
    } catch { return false }
  },
  async insertUser(data) {
    const row = { ...data, created_at: now() }
    const result = await _db.collection("users").insertOne(row)
    return { ...row, id: result.insertedId.toString() }
  },
  async getUserByEmail(email) {
    const row = await _db.collection("users").findOne({ email })
    return row ? { ...row, id: row._id.toString() } : null
  },
  async getUserByToken(token) {
    const t = await _db.collection("tokens").findOne({ token })
    if (!t) return null
    try {
      const row = await _db.collection("users").findOne({ _id: new ObjectId(t.userId) })
      return row ? { ...row, id: row._id.toString() } : null
    } catch { return null }
  },
  async getAllUsers() {
    const rows = await _db.collection("users").find({}).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async updateUserPassword(userId, hashedPassword) {
    try {
      const result = await _db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { password: hashedPassword } }
      )
      return result.modifiedCount > 0
    } catch { return false }
  },
  async updateUserProvider(userId, provider) {
    try {
      const result = await _db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { provider } }
      )
      return result.modifiedCount > 0
    } catch { return false }
  },
  async updateOperatorCode(userId, hashedCode) {
    try {
      const result = await _db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { operator_code: hashedCode } }
      )
      return result.modifiedCount > 0
    } catch { return false }
  },
  async saveToken(userId, token) {
    await _db.collection("tokens").deleteMany({ userId })
    await _db.collection("tokens").insertOne({ userId, token, created_at: now() })
  },
  async deleteToken(token) {
    await _db.collection("tokens").deleteOne({ token })
  },
  async insertConversation(data) {
    const row = { ...data, created_at: now() }
    const result = await _db.collection("conversations").insertOne(row)
    return { ...row, id: result.insertedId.toString() }
  },
  async getConversations(sessionId, limit = 30) {
    const rows = await _db.collection("conversations").find({ session_id: sessionId }).limit(limit).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async linkConversationsToTicket(sessionId, ticketId) {
    await _db.collection("conversations").updateMany(
      { session_id: sessionId, ticket_id: { $exists: false } },
      { $set: { ticket_id: ticketId } }
    )
  },
  async insertMessage(data) {
    const row = { ...data, created_at: now() }
    const result = await _db.collection("messages").insertOne(row)
    return { ...row, id: result.insertedId.toString() }
  },
  async getMessages(ticketId) {
    const rows = await _db.collection("messages").find({ ticket_id: ticketId.toString() }).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async searchKB(q, category, limit = 5) {
    const ql = q.toLowerCase()
    const rows = await _db.collection("knowledge_base").find({}).toArray()
    let filtered = rows.filter(r => {
      const kw = Array.isArray(r.keywords) ? r.keywords : []
      return (
        r.question.toLowerCase().includes(ql) ||
        r.answer.toLowerCase().includes(ql) ||
        kw.some(k => k.includes(ql) || ql.includes(k))
      )
    })
    if (category) filtered = filtered.filter(r => r.category === category)
    return filtered.map(r => {
      const kw = Array.isArray(r.keywords) ? r.keywords : []
      let score = 0
      if (r.question.toLowerCase().includes(ql)) score += 3
      if (r.answer.toLowerCase().includes(ql)) score += 1
      if (kw.some(k => k.includes(ql) || ql.includes(k))) score += 2
      return { ...r, id: r._id.toString(), score }
    }).sort((a, b) => b.score - a.score).slice(0, limit)
  },
  async incrementKBHits(ids) {
    for (const id of ids) {
      try {
        await _db.collection("knowledge_base").updateOne(
          { _id: new ObjectId(id) },
          { $inc: { hits: 1 } }
        )
      } catch {}
    }
  },
  async logMetric(event, sessionId = null, category = null, rating = null) {
    await _db.collection("metrics").insertOne({ event, session_id: sessionId, category, rating, created_at: now() })
  },
  async getAnalytics(from, to) {
    const tickets = await _db.collection("tickets").find({ created_at: { $gte: from, $lte: to } }).toArray()
    const metrics = await _db.collection("metrics").find({ created_at: { $gte: from, $lte: to } }).toArray()
    const byStatus = {}, byCategory = {}
    tickets.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1
      byCategory[t.category] = (byCategory[t.category] || 0) + 1
    })
    const ratings = metrics.filter(m => m.event === "answer_rated" && m.rating != null)
    const avgRating = ratings.length ? (ratings.reduce((s, m) => s + m.rating, 0) / ratings.length).toFixed(2) : null
    const topKB = await _db.collection("knowledge_base").find({}).sort({ hits: -1 }).limit(5).toArray()
    return {
      tickets: {
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
        byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
        escalations: tickets.length,
      },
      messages: { total: metrics.filter(m => m.event === "message_sent").length },
      rating: { avg: avgRating, total: ratings.length },
      topKnowledgeBase: topKB,
    }
  },
  async insertPasswordReset(data) {
    const existing = await _db.collection("password_resets").findOne({ email: data.email, status: "pending" })
    if (existing) return { ...existing, id: existing._id.toString() }
    const row = { ...data, status: "pending", created_at: now() }
    const result = await _db.collection("password_resets").insertOne(row)
    return { ...row, id: result.insertedId.toString() }
  },
  async getPasswordResets() {
    const rows = await _db.collection("password_resets").find({ status: "pending" }).toArray()
    return rows.map(r => ({ ...r, id: r._id.toString() }))
  },
  async resolvePasswordReset(id) {
    try {
      const result = await _db.collection("password_resets").updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "resolved" } }
      )
      return result.modifiedCount > 0
    } catch { return false }
  },
}

async function initDB() {
  _client = new MongoClient(MONGODB_URI)
  await _client.connect()
  _db = _client.db(DB_NAME)
  const kbCount = await _db.collection("knowledge_base").countDocuments()
  if (kbCount === 0) {
    await _db.collection("knowledge_base").insertMany([
      { category: "vpn", hits: 0, keywords: ["vpn", "cisco", "сеть", "подключение"],
        question: "VPN не подключается",
        answer: "1. Проверьте токен.\n2. Порт 1194 UDP.\n3. Перезапустите Cisco AnyConnect." },
      { category: "excel", hits: 0, keywords: ["excel", "0x800706ba", "office"],
        question: "Excel не запускается",
        answer: "1. Запустите от имени администратора.\n2. Проверьте VPN." },
      { category: "password", hits: 0, keywords: ["пароль", "сброс"],
        question: "Сбросить пароль",
        answer: "Обратитесь к администратору через CB-Support." },
    ])
    console.log("🌱  Knowledge base seeded")
  }
  console.log("✅  MongoDB ready:", DB_NAME)
}

module.exports = { initDB, getDB: () => dbHelpers }
