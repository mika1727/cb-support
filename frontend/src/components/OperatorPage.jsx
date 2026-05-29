import { useState, useEffect, useRef, useCallback } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, ChevronRight, ChevronLeft, X, Headphones,
  Clock, Star, CheckCircle2, AlertCircle, Circle,
  Monitor, Wifi, Package, Printer, Lock, Mail, Phone, MapPin, MessageCircle, Send
} from "lucide-react"
import { useApp } from "../App"

const API = "https://cb-support-d6jb.onrender.com/api"

const NAV_LINKS = [
  { label: "Главная", to: "/" },
  { label: "ИИ-Чат", to: "/chat" },
  { label: "Оператор", to: "/operator" },
  { label: "История", to: "/history" },
]

const GRADIENTS = [
  "from-brand-500 to-accent-cyan",
  "from-accent-pink to-brand-400",
  "from-brand-600 to-accent-cyan",
  "from-slate-400 to-slate-500",
  "from-emerald-400 to-brand-500",
  "from-amber-400 to-accent-pink",
]

const CATEGORIES = [
  { Icon: Monitor,      title: "Windows / ПК",  desc: "Ошибки ОС, синий экран, производительность" },
  { Icon: Wifi,         title: "Сеть и VPN",    desc: "Подключение, настройка, удалённый доступ" },
  { Icon: Package,      title: "Программы",     desc: "Office, 1C, корпоративный софт" },
  { Icon: Printer,      title: "Оборудование",  desc: "Принтеры, сканеры, периферия" },
  { Icon: Lock,         title: "Доступы",       desc: "Пароли, учётные записи, права" },
  { Icon: Mail,         title: "Почта",         desc: "Outlook, настройка, восстановление" },
  { Icon: MessageCircle,title: "Прочее",        desc: "Другой вопрос или проблема" },
]

const statusMap = {
  open:        { label: "Открыта",  Icon: AlertCircle,  cls: "bg-blue-50 text-blue-600 border-blue-200" },
  in_progress: { label: "В работе", Icon: Clock,         cls: "bg-brand-50 text-brand-600 border-brand-200" },
  waiting:     { label: "Ожидает",  Icon: AlertCircle,  cls: "bg-amber-50 text-amber-600 border-amber-200" },
  resolved:    { label: "Решено",   Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
}
const priorityDot = { high: "bg-red-400", medium: "bg-amber-400", normal: "bg-amber-400", low: "bg-emerald-400" }
const STEPS = ["Категория", "Описание", "Контакт", "Готово"]

function ChatModal({ ticket, user, onClose, darkMode }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/messages/${ticket.id}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) { console.error(e) }
  }, [ticket.id])

  useEffect(() => {
    fetchMessages()
    const iv = setInterval(fetchMessages, 3000)
    return () => clearInterval(iv)
  }, [fetchMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const sendMessage = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await fetch(`${API}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          senderId: user?.email || user?.id,
          senderName: user?.name || "Сотрудник",
          senderRole: "user",
          text: text.trim(),
        }),
      })
      setText("")
      fetchMessages()
    } catch (e) { console.error(e) }
    finally { setSending(false) }
  }

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-[2rem] w-full max-w-lg mx-4 shadow-2xl flex flex-col ${darkMode ? "bg-gray-800" : "bg-white"}`} style={{ height: "80vh" }}>
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? "border-gray-700" : "border-slate-100"}`}>
          <div>
            <p className={`font-bold ${darkMode ? "text-white" : "text-dark-900"}`}>#{ticket.id} · {ticket.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">Чат со специалистом</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-dark-900"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
              Начните переписку со специалистом
            </div>
          ) : messages.map((m, i) => {
            const isMe = m.sender_id === (user?.email || String(user?.id)) && m.sender_role === "user"
            return (
              <div key={i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-brand-500 text-white rounded-br-sm" : darkMode ? "bg-gray-700 text-white rounded-bl-sm" : "bg-slate-100 text-dark-900 rounded-bl-sm"}`}>
                  {!isMe && <p className="text-xs font-bold mb-1 text-brand-600">{m.sender_name}</p>}
                  <p>{m.text}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-white/60" : "text-slate-400"}`}>{formatTime(m.created_at)}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div className={`p-4 border-t ${darkMode ? "border-gray-700" : "border-slate-100"}`}>
          <div className="flex gap-3">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Написать сообщение..."
              className={`flex-1 px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "border-slate-200"}`} />
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

function NewTicketModal({ onClose, onSubmit, preCategory, user, darkMode }) {
  const [step, setStep] = useState(preCategory ? 2 : 1)
  const [form, setForm] = useState({ category: preCategory || "", title: "", desc: "", priority: "medium", phone: "", location: "" })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = () => { onSubmit(form); onClose() }

  const inp = `w-full px-5 py-3.5 rounded-2xl border-2 focus:outline-none text-sm font-medium placeholder:text-slate-400 ${darkMode ? "bg-gray-700 border-gray-600 text-white focus:border-brand-400" : "border-slate-100 bg-white text-dark-900 focus:border-brand-400"}`

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ background: "rgba(15,10,40,0.45)", backdropFilter: "blur(8px)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={`backdrop-blur-2xl rounded-[2.5rem] p-10 w-[540px] max-w-[92vw] shadow-2xl border relative max-h-[90vh] overflow-y-auto ${darkMode ? "bg-gray-800/95 border-gray-700" : "bg-white/90 border-white"}`}>
          <button onClick={onClose} className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-slate-100 hover:bg-slate-200 text-slate-500"}`}>
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((label, idx) => {
              const s = idx + 1
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= s ? "bg-gradient-to-tr from-brand-500 to-accent-cyan text-white shadow-md" : darkMode ? "bg-gray-700 text-gray-400" : "bg-slate-100 text-slate-400"}`}>{s}</div>
                  {s < STEPS.length && <div className={`w-8 h-0.5 rounded-full transition-all duration-500 ${step > s ? "bg-gradient-to-r from-brand-500 to-accent-cyan" : darkMode ? "bg-gray-700" : "bg-slate-100"}`} />}
                </div>
              )
            })}
            <span className="ml-2 text-xs font-medium text-slate-400 tracking-wide uppercase">{STEPS[step - 1]}</span>
          </div>

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className={`font-display text-2xl font-bold mb-1 ${darkMode ? "text-white" : "text-dark-900"}`}>Выберите категорию</h2>
              <p className="text-sm text-slate-500 mb-6">Это поможет назначить нужного специалиста</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CATEGORIES.map(c => (
                  <button key={c.title} onClick={() => set("category", c.title)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 group ${form.category === c.title ? "border-brand-500 bg-brand-50 shadow-md" : darkMode ? "border-gray-700 bg-gray-700/50 hover:border-brand-400" : "border-slate-100 bg-white hover:border-brand-200 hover:bg-slate-50"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${form.category === c.title ? "bg-brand-100 text-brand-600" : darkMode ? "bg-gray-600 text-gray-300" : "bg-slate-100 text-slate-500"}`}>
                      <c.Icon size={20} />
                    </div>
                    <div className={`text-sm font-semibold ${darkMode ? "text-white" : "text-dark-900"}`}>{c.title}</div>
                    <div className="text-xs text-slate-400 mt-1 leading-tight">{c.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => form.category && setStep(2)}
                className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 ${form.category ? "bg-dark-900 text-white hover:bg-brand-600 shadow-lg" : darkMode ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                Далее <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className={`font-display text-2xl font-bold mb-1 ${darkMode ? "text-white" : "text-dark-900"}`}>Опишите проблему</h2>
              <p className="text-sm text-slate-500 mb-6">Категория: <strong className="text-brand-600">{form.category}</strong></p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Тема заявки</label>
                  <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Коротко опишите проблему" className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Подробности</label>
                  <textarea value={form.desc} onChange={e => set("desc", e.target.value)} placeholder="Что произошло?" rows={3} className={`${inp} resize-none`} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Приоритет</label>
                  <div className="flex gap-2">
                    {[{ v: "low", l: "🟢 Низкий" }, { v: "medium", l: "🟡 Обычный" }, { v: "high", l: "🔴 Срочно" }].map(p => (
                      <button key={p.v} onClick={() => set("priority", p.v)}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${form.priority === p.v ? "border-brand-500 bg-brand-50 text-brand-700" : darkMode ? "border-gray-600 text-gray-300 bg-gray-700" : "border-slate-100 text-slate-500 bg-white"}`}>
                        {p.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className={`flex items-center gap-1 px-5 py-4 rounded-2xl border-2 font-medium text-sm ${darkMode ? "border-gray-700 text-gray-300" : "border-slate-100 text-slate-500"}`}>
                  <ChevronLeft size={16} /> Назад
                </button>
                <button onClick={() => form.title && setStep(3)}
                  className={`flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 ${form.title ? "bg-dark-900 text-white hover:bg-brand-600 shadow-lg" : darkMode ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                  Далее <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className={`font-display text-2xl font-bold mb-1 ${darkMode ? "text-white" : "text-dark-900"}`}>Как с вами связаться?</h2>
              <p className="text-sm text-slate-500 mb-6">Специалист сможет найти вас быстрее</p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">От кого</label>
                  <input value={form.senderName ?? (user?.name || "")} onChange={e => set("senderName", e.target.value)} placeholder="Ваше имя" className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Номер телефона</label>
                  <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 777 123 45 67" className={inp} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Кабинет / адрес</label>
                  <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Например: кабинет 214" className={inp} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4 text-center">Можно пропустить</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className={`flex items-center gap-1 px-5 py-4 rounded-2xl border-2 font-medium text-sm ${darkMode ? "border-gray-700 text-gray-300" : "border-slate-100 text-slate-500"}`}>
                  <ChevronLeft size={16} /> Назад
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 bg-dark-900 text-white hover:bg-brand-600 shadow-lg">
                  Далее <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className={`font-display text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-dark-900"}`}>Подтвердите заявку</h2>
              <div className={`rounded-2xl p-5 mb-4 border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gradient-to-br from-slate-50 to-brand-50/40 border-slate-100"}`}>
                {[
                  { l: "От кого", v: form.senderName || user?.name || "Аноним" },
                  { l: "Категория", v: form.category },
                  { l: "Тема", v: form.title },
                  { l: "Приоритет", v: form.priority === "low" ? "Низкий" : form.priority === "high" ? "Срочно" : "Обычный" },
                  ...(form.phone ? [{ l: "Телефон", v: form.phone }] : []),
                  ...(form.location ? [{ l: "Местонахождение", v: form.location }] : []),
                ].map(r => (
                  <div key={r.l} className={`flex justify-between items-center py-2 border-b last:border-none ${darkMode ? "border-gray-600" : "border-slate-100"}`}>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">{r.l}</span>
                    <span className={`text-sm font-bold ${darkMode ? "text-white" : "text-dark-900"}`}>{r.v}</span>
                  </div>
                ))}
                {form.desc && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{form.desc}</p>}
              </div>
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 rounded-2xl px-4 py-3 mb-6 border border-emerald-100 text-sm font-medium">
                <CheckCircle2 size={16} className="shrink-0" />
                Среднее время ответа — <strong>4 минуты</strong>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className={`flex items-center gap-1 px-5 py-4 rounded-2xl border-2 font-medium text-sm ${darkMode ? "border-gray-700 text-gray-300" : "border-slate-100 text-slate-500"}`}>
                  <ChevronLeft size={16} /> Назад
                </button>
                <button onClick={handleSubmit} className="flex-1 py-4 rounded-2xl font-semibold bg-gradient-to-r from-brand-500 to-accent-cyan text-white shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 transition-all">
                  <CheckCircle2 size={18} /> Отправить заявку
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function OperatorPage({ user }) {
  const { darkMode } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [preCategory, setPreCategory] = useState("")
  const [targetOperatorId, setTargetOperatorId] = useState(null)
  const [operators, setOperators] = useState([])
  const [tickets, setTickets] = useState([])
  const [chatTicket, setChatTicket] = useState(null)

  const userId = user?.email || user?.id || "anonymous"

  useEffect(() => {
    fetch(`${API}/operators`).then(r => r.json()).then(d => setOperators(d.operators || [])).catch(() => {})
  }, [])

  const fetchTickets = useCallback(() => {
    fetch(`${API}/tickets?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(d => setTickets(d.tickets || [])).catch(() => {})
  }, [userId])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const openModal = (cat = "", operatorId = null) => { setPreCategory(cat); setTargetOperatorId(operatorId); setShowModal(true) }

  const addTicket = async (form) => {
    try {
      await fetch(`${API}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, userName: form.senderName ?? user?.name ?? "",
          title: form.title,
          description: `${form.desc || form.title}${form.phone ? `\n📞 Телефон: ${form.phone}` : ""}${form.location ? `\n📍 Местонахождение: ${form.location}` : ""}`,
          category: form.category, priority: form.priority, operator_id: targetOperatorId,
        }),
      })
      fetchTickets()
    } catch (e) { console.error(e) }
  }

  const onlineCount = operators.filter(o => o.online).length
  const STATS = [
    { num: String(onlineCount), suffix: "", label: "Операторов онлайн", icon: "🟢" },
    { num: "4", suffix: "m", label: "Среднее время ответа", icon: "⚡" },
    { num: "98", suffix: "%", label: "Довольных сотрудников", icon: "⭐" },
    { num: String(tickets.filter(t => t.status === "open").length), suffix: "", label: "В очереди сейчас", icon: "📋" },
  ]

  const formatTime = (iso) => {
    if (!iso) return ""
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
    if (diff < 1) return "Только что"
    if (diff < 60) return `${diff} мин назад`
    if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`
    return `${Math.floor(diff / 1440)} д назад`
  }

  const bg   = darkMode ? "bg-gray-950" : ""
  const text = darkMode ? "text-white"  : "text-dark-900"
  const card = darkMode ? "bg-gray-800/60 border-gray-700" : "bg-white/60 border-white"

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden relative transition-colors duration-300 ${bg}`}>
      <div className={`fixed inset-0 pointer-events-none z-[-1] ${darkMode ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" : "bg-gradient-to-br from-[#f8f6ff] via-[#fce7f3]/40 to-[#e0f2fe]/40"}`} />
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[5%] -left-[10%] w-[600px] h-[600px] rounded-full bg-brand-300/20 blur-[120px]" />
        <div className="absolute top-[40%] -right-[15%] w-[700px] h-[700px] rounded-full bg-accent-pink/25 blur-[150px]" />
        <div className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full bg-accent-cyan/30 blur-[130px]" />
      </div>

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} onSubmit={addTicket} preCategory={preCategory} user={user} darkMode={darkMode} />}
      <AnimatePresence>
        {chatTicket && <ChatModal ticket={chatTicket} user={user} onClose={() => setChatTicket(null)} darkMode={darkMode} />}
      </AnimatePresence>

      <div className="relative z-10 pt-24">
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white text-brand-700 text-sm font-medium mb-6 shadow-sm">
            <Headphones size={16} className="text-brand-500" />
            Живая поддержка
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
                className={`font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight mb-5 ${text}`}>
                Операторы<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-cyan">всегда рядом</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
                className={`text-lg mb-8 max-w-lg leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-600"}`}>
                Если ИИ не справился — живой специалист возьмётся за вашу задачу.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.32 }}
                className="flex flex-wrap items-center gap-4">
                <button onClick={() => openModal()}
                  className="flex items-center gap-2 bg-dark-900 text-white px-8 py-4 rounded-2xl font-medium shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all hover:-translate-y-1 text-base">
                  + Создать заявку <ChevronRight size={18} />
                </button>
                <Link to="/chat" className={`px-8 py-4 rounded-2xl font-medium backdrop-blur-md border hover:border-brand-200 transition-all shadow-sm text-base ${darkMode ? "bg-gray-800/60 border-gray-700 text-white hover:bg-gray-800" : "bg-white/60 border-white text-slate-700 hover:bg-white"}`}>
                  🤖 Сначала спросить ИИ
                </Link>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.35 }}
              className="grid grid-cols-2 gap-4">
              {STATS.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                  className={`backdrop-blur-xl rounded-3xl p-6 border shadow-lg hover:-translate-y-1 transition-all duration-300 ${card}`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`font-display text-3xl font-extrabold ${text}`}>{s.num}<span className="text-brand-300 text-xl">{s.suffix}</span></div>
                  <div className={`text-xs font-medium mt-1 ${darkMode ? "text-gray-400" : "text-slate-500"}`}>{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-16 grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
            <h2 className={`font-display text-2xl font-bold mb-5 ${text}`}>Специалисты</h2>
            {operators.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-sm">Специалисты не найдены</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {operators.map((op, i) => {
                  const initials = op.name.split(" ").map(n => n[0]).join("").slice(0, 2)
                  const gradient = GRADIENTS[i % GRADIENTS.length]
                  return (
                    <motion.div key={op.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.07 }}
                      className={`backdrop-blur-xl rounded-[1.75rem] p-5 border shadow-lg hover:-translate-y-1 transition-all duration-300 group ${card}`}>
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}>{initials}</div>
                          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${op.online ? "bg-emerald-400" : "bg-slate-300"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-display font-bold ${text}`}>{op.name}</span>
                            {op.rating && <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><Star size={11} fill="currentColor" /> {op.rating}</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{op.role}</p>
                        </div>
                      </div>
                      {op.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                          {op.tags.map(t => <span key={t} className="px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-medium">{t}</span>)}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {op.phone && <a href={`tel:${op.phone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100"><Phone size={10} /> {op.phone}</a>}
                        {op.whatsapp && <a href={`https://wa.me/${op.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium hover:bg-emerald-100">💬 WhatsApp</a>}
                        {op.telegram && <a href={`https://t.me/${op.telegram.replace("@","")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-100">✈️ Telegram</a>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium flex items-center gap-1.5 ${op.online ? "text-emerald-600" : "text-slate-400"}`}>
                          <Circle size={7} fill="currentColor" />{op.online ? "Онлайн" : "Не в сети"}
                        </span>
                        <button onClick={() => openModal("", op.id)} className="px-4 py-2 rounded-xl bg-dark-900 text-white text-xs font-semibold hover:bg-brand-600 transition-all active:scale-95 shadow-sm">
                          Написать
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`font-display text-2xl font-bold ${text}`}>Мои заявки</h2>
              <button onClick={() => openModal()} className="text-sm font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl border border-brand-100 transition-all">+ Новая</button>
            </div>
            {tickets.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="text-5xl mb-4">📋</motion.div>
                <p className="text-sm font-medium">Заявок пока нет</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map((t, i) => {
                  const st = statusMap[t.status] || statusMap.open
                  return (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.07 }}
                      className={`backdrop-blur-xl rounded-2xl p-5 border shadow-md transition-all duration-200 ${card}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${priorityDot[t.priority] || "bg-slate-300"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-lg">#{t.id}</span>
                            <span className="text-xs text-slate-400">{t.category}</span>
                          </div>
                          <p className={`text-sm font-semibold truncate ${text}`}>{t.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{formatTime(t.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.operator_id && (
                            <button onClick={() => setChatTicket(t)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 border border-brand-200 text-xs font-bold hover:bg-brand-100 transition-colors">
                              <MessageCircle size={12} /> Чат
                            </button>
                          )}
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

            <div className="mt-8">
              <h3 className={`font-display text-xl font-bold mb-4 ${text}`}>Быстрая заявка</h3>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map((c, i) => (
                  <motion.button key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 + i * 0.06 }}
                    onClick={() => openModal(c.title)}
                    className={`p-4 rounded-2xl backdrop-blur-xl border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 text-left group ${card}`}>
                    <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <c.Icon size={18} />
                    </div>
                    <p className={`text-xs font-bold leading-tight ${text}`}>{c.title}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <footer className="relative z-10 bg-dark-900 mt-6">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-cyan flex items-center justify-center text-white">
                <Sparkles size={16} fill="currentColor" />
              </div>
              <span className="font-display font-bold text-xl text-white">CB-Support</span>
            </div>
            <p className="text-sm text-slate-500">© 2026 CB-Support. Техническая поддержка сотрудников.</p>
            <div className="flex gap-6">
              {NAV_LINKS.map(l => <Link key={l.label} to={l.to} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</Link>)}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
