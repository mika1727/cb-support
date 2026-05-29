import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Clock, AlertCircle, X, RefreshCcw, Send, MessageSquare } from "lucide-react"
import { useApp } from "../App"

const API = "https://cb-support-d6jb.onrender.com/api"

const STATUS_MAP = {
  open:        { label: "Открыт",   cls: "bg-blue-50 text-blue-600 border-blue-200",         Icon: AlertCircle  },
  in_progress: { label: "В работе", cls: "bg-brand-50 text-brand-600 border-brand-200",       Icon: Clock        },
  resolved:    { label: "Решено",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200", Icon: CheckCircle2 },
  closed:      { label: "Закрыт",   cls: "bg-slate-50 text-slate-500 border-slate-200",       Icon: X            },
}

const PRIORITY_DOT   = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-emerald-400" }
const PRIORITY_LABEL = { high: "Срочно", medium: "Обычный", low: "Низкий" }

function ChatModal({ ticket, user, onClose, onRead, dm }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState("")
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/messages/${ticket.id}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) { console.error(e) }
  }, [ticket.id])

  useEffect(() => { fetchMessages(); const iv = setInterval(fetchMessages, 3000); return () => clearInterval(iv) }, [fetchMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); onRead(ticket.id) }, [messages])

  const sendMessage = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await fetch(`${API}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, senderId: user?.email || user?.id, senderName: user?.name || "Специалист", senderRole: user?.role || "operator", text: text.trim() }),
      })
      setText(""); fetchMessages(); onRead(ticket.id)
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-[2rem] w-full max-w-lg mx-4 shadow-2xl flex flex-col ${dm ? "bg-gray-800" : "bg-white"}`} style={{ height: "80vh" }}>
        <div className={`flex items-center justify-between p-6 border-b ${dm ? "border-gray-700" : "border-slate-100"}`}>
          <div>
            <p className={`font-bold ${dm ? "text-white" : "text-dark-900"}`}>#{ticket.id} · {ticket.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">👤 {ticket.user_name || "Сотрудник"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-dark-900"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              Начните переписку
            </div>
          ) : messages.map((m, i) => {
            const isMe = m.sender_role === "operator"
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-brand-500 text-white rounded-br-sm" : dm ? "bg-gray-700 text-white rounded-bl-sm" : "bg-slate-100 text-dark-900 rounded-bl-sm"}`}>
                  {!isMe && <p className="text-xs font-bold mb-1 text-brand-600">{m.sender_name}</p>}
                  <p>{m.text}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-white/60" : "text-slate-400"}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div className={`p-4 border-t ${dm ? "border-gray-700" : "border-slate-100"}`}>
          <div className="flex gap-3">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Написать сообщение..."
              className={`flex-1 px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${dm ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "border-slate-200"}`} />
            <button onClick={sendMessage} disabled={sending || !text.trim()}
              className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function MyRequestsPage({ user }) {
  const { darkMode: dm } = useApp()
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [chatTicket, setChatTicket] = useState(null)
  const [filter, setFilter]       = useState("all")
  const [unread, setUnread]       = useState({})
  const lastReadRef = useRef(
    (() => { try { return JSON.parse(localStorage.getItem("cb_last_read") || "{}") } catch { return {} } })()
  )

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tickets`)
      const data = await res.json()
      const myTickets = (data.tickets || []).filter(t => t.operator_id && String(t.operator_id) === String(user?.operatorId))
      setTickets(myTickets)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [user?.operatorId])

  const checkUnread = useCallback(async (ticketList) => {
    const newUnread = {}
    for (const t of ticketList) {
      try {
        const res = await fetch(`${API}/messages/${t.id}`)
        const data = await res.json()
        const msgs = data.messages || []
        const lastRead = lastReadRef.current[t.id] || 0
        const count = msgs.filter(m => m.sender_role === "user" && new Date(m.created_at).getTime() > lastRead).length
        if (count > 0) newUnread[t.id] = count
      } catch {}
    }
    setUnread(newUnread)
  }, [])

  useEffect(() => { fetchTickets(); const iv = setInterval(fetchTickets, 10000); return () => clearInterval(iv) }, [fetchTickets])
  useEffect(() => {
    if (tickets.length > 0) { checkUnread(tickets); const iv = setInterval(() => checkUnread(tickets), 5000); return () => clearInterval(iv) }
  }, [tickets, checkUnread])

  const handleRead = (ticketId) => {
    lastReadRef.current[ticketId] = Date.now()
    localStorage.setItem("cb_last_read", JSON.stringify(lastReadRef.current))
    setUnread(prev => { const n = { ...prev }; delete n[ticketId]; return n })
  }

  const updateTicket = async (id, fields) => {
    await fetch(`${API}/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) })
    fetchTickets()
    if (selected?.id === id) setSelected(p => ({ ...p, ...fields }))
  }

  const filtered = tickets.filter(t => filter === "all" || t.status === filter)

  const formatTime = (iso) => {
    if (!iso) return ""
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
    if (diff < 1) return "Только что"
    if (diff < 60) return `${diff} мин назад`
    if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`
    return `${Math.floor(diff / 1440)} д назад`
  }

  const getUserLabel = (t) => {
    if (t.user_name) return t.user_name
    if (t.user_id && t.user_id !== "anonymous") {
      if (t.user_id.includes("@")) return t.user_id.split("@")[0]
      return t.user_id
    }
    return "Аноним"
  }

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  const bg   = dm ? "bg-gray-950"   : "bg-[#fdfcff]"
  const card = dm ? "bg-gray-800/70 border-gray-700" : "bg-white/70 border-white"
  const text = dm ? "text-white"    : "text-dark-900"
  const btn  = dm ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
  const modal = dm ? "bg-gray-800" : "bg-white"

  return (
    <div className={`min-h-screen font-sans relative transition-colors duration-300 ${bg}`}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#fbcfe8]/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#ddd6fe]/50 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className={`font-display font-bold text-2xl ${text}`}>Личные обращения</h1>
              {totalUnread > 0 && <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread} новых</span>}
            </div>
            <p className="text-sm text-slate-400 mt-1">Заявки адресованные лично вам</p>
          </div>
          <button onClick={fetchTickets} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-medium transition-colors shadow-sm ${btn}`}>
            <RefreshCcw size={14} /> Обновить
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Всего",    val: tickets.length,                                         color: text              },
            { label: "Открытых", val: tickets.filter(t => t.status === "open").length,        color: "text-blue-600"   },
            { label: "В работе", val: tickets.filter(t => t.status === "in_progress").length, color: "text-brand-600"  },
            { label: "Решено",   val: tickets.filter(t => t.status === "resolved").length,    color: "text-emerald-600"},
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`backdrop-blur-xl rounded-2xl p-4 border shadow-md text-center ${card}`}>
              <div className={`font-display text-3xl font-extrabold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[["all","Все"],["open","Открытые"],["in_progress","В работе"],["resolved","Решено"]].map(([k,v]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${filter === k ? "bg-dark-900 text-white border-dark-900" : dm ? "bg-gray-800 border-gray-700 text-gray-300 hover:border-brand-400" : "bg-white border-slate-100 text-slate-500 hover:border-brand-200"}`}>
              {v}
            </button>
          ))}
        </div>

        {loading ? <div className="text-center py-16 text-slate-400">Загрузка...</div>
          : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="text-5xl mb-4">📬</motion.div>
              <p className="text-sm font-medium">Личных обращений пока нет</p>
              <p className="text-xs text-slate-300 mt-2">Здесь появятся заявки когда сотрудник напишет вам напрямую</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((t, i) => {
                const st = STATUS_MAP[t.status] || STATUS_MAP.open
                const hasUnread = unread[t.id] > 0
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className={`backdrop-blur-xl rounded-2xl p-5 border shadow-md transition-all ${hasUnread ? "border-emerald-200 shadow-emerald-100" : dm ? "bg-gray-800/70 border-gray-700" : "bg-white/70 border-white"}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[t.priority] || "bg-slate-300"}`} />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelected(t)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">#{t.id}</span>
                          <span className="text-xs text-slate-400">{t.category}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${dm ? "text-gray-300 bg-gray-700" : "text-slate-500 bg-slate-100"}`}>👤 {getUserLabel(t)}</span>
                        </div>
                        <p className={`text-sm font-semibold truncate ${text}`}>{t.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatTime(t.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setChatTicket(t); handleRead(t.id) }}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${hasUnread ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" : "bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-100"}`}>
                          <MessageSquare size={12} /> Чат
                          {hasUnread && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">{unread[t.id]}</span>}
                        </button>
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${st.cls}`}>
                          <st.Icon size={12} /> {st.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-[2rem] p-8 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto ${modal}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">#{selected.id}</span>
                  <h2 className={`font-bold text-lg mt-2 ${text}`}>{selected.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selected.category} · {PRIORITY_LABEL[selected.priority]}</p>
                  <p className="text-xs text-slate-500 mt-1">👤 От: <strong>{getUserLabel(selected)}</strong></p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-dark-900"><X size={18} /></button>
              </div>
              {selected.description && (
                <div className={`rounded-2xl p-4 mb-4 text-sm leading-relaxed whitespace-pre-line ${dm ? "bg-gray-700 text-gray-200" : "bg-slate-50 text-slate-700"}`}>{selected.description}</div>
              )}
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Статус</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <button key={k} onClick={() => updateTicket(selected.id, { status: k })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selected.status === k ? v.cls + " shadow-sm" : dm ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"}`}>
                      <v.Icon size={11} /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                {selected.status !== "resolved" && (
                  <button onClick={() => updateTicket(selected.id, { status: "resolved", resolution: "Решено специалистом" })}
                    className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Отметить решённым
                  </button>
                )}
                <button onClick={() => { setSelected(null); setChatTicket(selected); handleRead(selected.id) }}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200 text-sm font-semibold hover:bg-brand-100 transition-colors">
                  <MessageSquare size={16} /> Открыть чат
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatTicket && <ChatModal ticket={chatTicket} user={user} onClose={() => setChatTicket(null)} onRead={handleRead} dm={dm} />}
      </AnimatePresence>
    </div>
  )
}
