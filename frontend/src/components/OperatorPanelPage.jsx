import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft, CheckCircle2, Clock, AlertCircle, Plus,
  Trash2, X, RefreshCcw, Wifi, WifiOff, Phone,
  MessageCircle, Send, KeyRound
} from "lucide-react"
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
const EMPTY_OP = { name: "", email: "", role: "", tags: "", phone: "", whatsapp: "", telegram: "", instagram: "" }

// Анимированный бейдж статуса
function StatusBadge({ status }) {
  const st = STATUS_MAP[status] || STATUS_MAP.open
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${st.cls}`}>
      <st.Icon size={11} /> {st.label}
    </motion.span>
  )
}

export default function OperatorPanelPage({ user }) {
  const { darkMode: dm } = useApp()
  const [tickets, setTickets]           = useState([])
  const [allTickets, setAllTickets]     = useState([])
  const [operators, setOperators]       = useState([])
  const [filter, setFilter]             = useState("all")
  const [selected, setSelected]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [showAddOp, setShowAddOp]       = useState(false)
  const [newOp, setNewOp]               = useState(EMPTY_OP)
  const [activeTab, setActiveTab]       = useState("tickets")
  const [resetResult, setResetResult]   = useState(null)
  const [users, setUsers]               = useState([])
  const [resetUserResult, setResetUserResult] = useState(null)
  const [passwordResets, setPasswordResets]   = useState([])
  const [updatingStatus, setUpdatingStatus]   = useState(null) // id заявки при обновлении

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, oRes] = await Promise.all([fetch(`${API}/tickets`), fetch(`${API}/operators`)])
      const all = (await tRes.json()).tickets || []
      setAllTickets(all)
      setTickets(all.filter(t => !t.operator_id && t.status !== "resolved" && t.status !== "closed"))
      setOperators((await oRes.json()).operators || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const fetchUsers = async () => {
    try {
      const [uRes, rRes] = await Promise.all([fetch(`${API}/auth/users`), fetch(`${API}/auth/password-resets`)])
      const uData = await uRes.json()
      const rData = await rRes.json()
      setUsers((uData.users || []).filter(u => u.role === "user"))
      setPasswordResets(rData.resets || [])
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchAll(); fetchUsers(); const iv = setInterval(fetchAll, 10000); return () => clearInterval(iv) }, [fetchAll])

  const updateTicket = async (id, fields) => {
    setUpdatingStatus(id)
    await fetch(`${API}/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) })
    fetchAll()
    if (selected?.id === id) setSelected(p => ({ ...p, ...fields }))
    setTimeout(() => setUpdatingStatus(null), 600)
  }

  const toggleOnline   = async (op)  => { await fetch(`${API}/operators/${op.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ online: !op.online }) }); fetchAll() }
  const deleteOperator = async (id)  => { await fetch(`${API}/operators/${id}`, { method: "DELETE" }); fetchAll() }

  const addOperator = async () => {
    if (!newOp.name || !newOp.email) return
    await fetch(`${API}/operators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newOp, tags: newOp.tags.split(",").map(t => t.trim()).filter(Boolean) }) })
    setNewOp(EMPTY_OP); setShowAddOp(false); fetchAll()
  }

  const resetOperatorCode = async (op) => {
    const tempCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    try {
      const res = await fetch(`${API}/auth/reset-operator-code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: op.email, tempCode }) })
      if (res.ok) setResetResult({ name: op.name, code: tempCode })
    } catch (e) { console.error(e) }
  }

  const resetUserPassword = async (u) => {
    const tempPassword = Math.random().toString(36).slice(2, 10)
    try {
      const res = await fetch(`${API}/auth/reset-user-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, tempPassword }) })
      if (res.ok) setResetUserResult({ name: u.name, email: u.email, password: tempPassword })
    } catch (e) { console.error(e) }
  }

  const filtered = tickets.filter(t => filter === "all" || t.status === filter)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const stats = {
    total:      tickets.length,
    open:       tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved:   allTickets.filter(t => (t.status === "resolved" || t.status === "closed") && t.updated_at >= startOfMonth).length,
    onlineOps:  operators.filter(o => o.online).length,
  }

  const getUserLabel = (t) => {
    if (t.user_name) return t.user_name
    if (t.user_id && t.user_id !== "anonymous") {
      if (t.user_id.includes("@")) return t.user_id.split("@")[0]
      return t.user_id
    }
    return "Аноним"
  }

  // Бейдж типа аккаунта пользователя
  const getUserProviderBadge = (u) => {
    if (u.provider === "google" && u.hasPassword) return { label: "Google + Пароль", cls: "bg-purple-50 text-purple-600" }
    if (u.provider === "google") return { label: "Google", cls: "bg-blue-50 text-blue-600" }
    return { label: "Email/Пароль", cls: dm ? "bg-gray-700 text-gray-300" : "bg-slate-50 text-slate-600" }
  }

  const bg    = dm ? "bg-gray-950"   : "bg-[#fdfcff]"
  const card  = dm ? "bg-gray-800/70 border-gray-700" : "bg-white/70 border-white"
  const text  = dm ? "text-white"    : "text-dark-900"
  const inp   = dm ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "border-slate-200"
  const btn   = dm ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
  const modal = dm ? "bg-gray-800" : "bg-white"

  return (
    <div className={`min-h-screen font-sans relative transition-colors duration-300 ${bg}`}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#fbcfe8]/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#ddd6fe]/50 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-colors border ${btn}`}><ChevronLeft size={20} /></Link>
            <div>
              <h1 className={`font-display font-bold text-2xl ${text}`}>Панель специалиста</h1>
              <p className="text-sm text-slate-400">Управление заявками и командой</p>
            </div>
          </div>
          <button onClick={fetchAll} className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-medium transition-colors shadow-sm ${btn}`}>
            <RefreshCcw size={14} /> Обновить
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Всего заявок", val: stats.total,      color: text              },
            { label: "Открытых",     val: stats.open,       color: "text-blue-600"   },
            { label: "В работе",     val: stats.inProgress, color: "text-brand-600"  },
            { label: "Решено",       val: stats.resolved,   color: "text-emerald-600"},
            { label: "Онлайн",       val: stats.onlineOps,  color: "text-emerald-500"},
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`backdrop-blur-xl rounded-2xl p-4 border shadow-md text-center ${card}`}>
              <div className={`font-display text-3xl font-extrabold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { id: "tickets",   label: "Заявки" },
            ...(user?.role === "admin" ? [{ id: "operators", label: "Специалисты" }] : []),
            ...(user?.role === "admin" ? [{ id: "users",     label: "Сотрудники"  }] : []),
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-dark-900 text-white shadow-md" : dm ? "bg-gray-800 border border-gray-700 text-gray-300 hover:border-brand-400" : "bg-white border border-slate-100 text-slate-600 hover:border-brand-200"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TICKETS */}
        {activeTab === "tickets" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[["all","Все"],["open","Открытые"],["in_progress","В работе"]].map(([k,v]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${filter === k ? "bg-dark-900 text-white border-dark-900" : dm ? "bg-gray-800 border-gray-700 text-gray-300 hover:border-brand-400" : "bg-white border-slate-100 text-slate-500 hover:border-brand-200"}`}>
                    {v}
                  </button>
                ))}
              </div>
              {loading ? <div className="text-center py-12 text-slate-400">Загрузка...</div>
                : filtered.length === 0 ? <div className="text-center py-12 text-slate-400"><div className="text-4xl mb-3">📋</div><p className="text-sm">Заявок нет</p></div>
                : (
                  <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                    {filtered.map(t => (
                      <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelected(t)}
                        className={`backdrop-blur-xl rounded-2xl p-4 border cursor-pointer transition-all ${selected?.id === t.id ? "border-brand-300 shadow-md shadow-brand-500/10" : dm ? "bg-gray-800/70 border-gray-700 hover:shadow-md" : "bg-white/70 border-white shadow-sm hover:shadow-md"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[t.priority] || "bg-slate-300"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">#{t.id}</span>
                              <span className="text-xs text-slate-400">{t.category}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${dm ? "text-gray-300 bg-gray-700" : "text-slate-500 bg-slate-100"}`}>👤 {getUserLabel(t)}</span>
                            </div>
                            <p className={`text-sm font-semibold truncate ${text}`}>{t.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{new Date(t.created_at).toLocaleString("ru-RU")}</p>
                          </div>
                          {updatingStatus === t.id ? (
                            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin shrink-0 mt-1" />
                          ) : (
                            <StatusBadge status={t.status} />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div>
            {passwordResets.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">🔔 Запросы на сброс пароля ({passwordResets.length})</p>
                <div className="flex flex-col gap-2">
                  {passwordResets.map((r) => (
                    <div key={r.id} className="bg-red-50 rounded-2xl p-4 border border-red-200 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-dark-900">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.email}</p>
                      </div>
                      <button onClick={async () => {
                        const tempPassword = Math.random().toString(36).slice(2, 10)
                        const res = await fetch(`${API}/auth/resolve-password-reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, email: r.email, tempPassword }) })
                        if (res.ok) { setResetUserResult({ name: r.name, email: r.email, password: tempPassword }); fetchUsers() }
                      }} className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1.5">
                        <KeyRound size={12} /> Сбросить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-slate-500 mb-4">{users.length} сотрудников в системе</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u, i) => {
                const badge = getUserProviderBadge(u)
                return (
                  <motion.div key={u.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -2 }}
                    className={`backdrop-blur-xl rounded-3xl p-5 border shadow-md ${card}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Цветной аватар с инициалами */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md bg-gradient-to-tr ${
                          ["from-brand-500 to-accent-cyan", "from-accent-pink to-brand-400", "from-emerald-400 to-brand-500", "from-amber-400 to-accent-pink"][i % 4]
                        }`}>
                          {u.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${text}`}>{u.name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[120px]">{u.email}</p>
                        </div>
                      </div>
                      {/* Кнопка сброса пароля — только если есть пароль */}
                      {(u.provider !== "google" || u.hasPassword) && (
                        <button onClick={() => resetUserPassword(u)} className="text-slate-300 hover:text-amber-400 transition-colors" title="Сбросить пароль">
                          <KeyRound size={14} />
                        </button>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </motion.div>
                )
              })}
              {users.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400"><div className="text-4xl mb-3">👤</div><p className="text-sm">Сотрудников нет</p></div>}
            </div>
          </div>
        )}

        {/* OPERATORS */}
        {activeTab === "operators" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-500">{operators.length} специалистов в системе</p>
              <button onClick={() => setShowAddOp(true)} className="flex items-center gap-2 px-4 py-2 bg-dark-900 text-white rounded-2xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-md">
                <Plus size={16} /> Добавить
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operators.map((op, i) => (
                <motion.div key={op.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className={`backdrop-blur-xl rounded-3xl p-5 border shadow-md ${card}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {op.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${op.online ? "bg-emerald-400" : "bg-slate-300"}`} />
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${text}`}>{op.name}</p>
                        <p className="text-xs text-slate-400">{op.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => resetOperatorCode(op)} className="text-slate-300 hover:text-amber-400 transition-colors" title="Сбросить код"><KeyRound size={14} /></button>
                      <button onClick={() => deleteOperator(op.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{op.email}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {op.phone && <a href={`tel:${op.phone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100"><Phone size={11} /> {op.phone}</a>}
                    {op.whatsapp && <a href={`https://wa.me/${op.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-medium hover:bg-emerald-100"><MessageCircle size={11} /> WhatsApp</a>}
                    {op.telegram && <a href={`https://t.me/${op.telegram.replace("@","")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-100"><Send size={11} /> Telegram</a>}
                  </div>
                  {op.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {op.tags.map(t => <span key={t} className="px-2.5 py-1 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-xs font-medium">{t}</span>)}
                    </div>
                  )}
                  <button onClick={() => toggleOnline(op)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${op.online ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}>
                    {op.online ? <><Wifi size={12} /> Онлайн — нажми чтобы уйти</> : <><WifiOff size={12} /> Офлайн — нажми чтобы выйти онлайн</>}
                  </button>
                </motion.div>
              ))}
              {operators.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400"><div className="text-4xl mb-3">👥</div><p className="text-sm">Нет специалистов. Добавьте первого!</p></div>}
            </div>
          </div>
        )}

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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selected.status === k ? v.cls + " shadow-sm" : dm ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"}`}>
                        <v.Icon size={11} /> {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Назначить оператора</p>
                  <div className="flex flex-wrap gap-2">
                    {operators.map(op => (
                      <button key={op.id} onClick={() => updateTicket(selected.id, { operator_id: op.id, status: "in_progress" })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selected.operator_id === op.id ? "bg-brand-50 text-brand-600 border-brand-200" : dm ? "bg-gray-700 border-gray-600 text-gray-300 hover:border-brand-400" : "bg-white border-slate-100 text-slate-600 hover:border-brand-200"}`}>
                        {op.name} {op.online ? "🟢" : "⚫"}
                      </button>
                    ))}
                  </div>
                </div>
                {selected.status !== "resolved" && (
                  <button onClick={() => updateTicket(selected.id, { status: "resolved", resolution: "Решено оператором" })}
                    className="w-full py-3 rounded-2xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Отметить решённым
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add operator modal */}
      <AnimatePresence>
        {showAddOp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowAddOp(false) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-[2rem] p-8 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto ${modal}`}>
              <h3 className={`font-bold text-xl mb-6 ${text}`}>Добавить специалиста</h3>
              <div className="space-y-4 mb-6">
                {[
                  { label: "Имя *",               key: "name",  placeholder: "Иван Иванов" },
                  { label: "Email *",              key: "email", placeholder: "ivan@company.com" },
                  { label: "Должность",            key: "role",  placeholder: "Специалист 1 линии" },
                  { label: "Теги (через запятую)", key: "tags",  placeholder: "Windows, VPN, Office" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">{f.label}</label>
                    <input value={newOp[f.key]} onChange={e => setNewOp(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${inp}`} />
                  </div>
                ))}
                <div className={`pt-2 border-t ${dm ? "border-gray-700" : "border-slate-100"}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Контакты (необязательно)</p>
                  <div className="space-y-3">
                    {[
                      { key: "phone",    icon: <Phone size={14} className="text-slate-500" />,           placeholder: "+7 777 123 45 67",         bg: dm ? "bg-gray-700" : "bg-slate-100" },
                      { key: "whatsapp", icon: <MessageCircle size={14} className="text-emerald-500" />, placeholder: "WhatsApp: +7 777 123 45 67", bg: "bg-emerald-50" },
                      { key: "telegram", icon: <Send size={14} className="text-blue-500" />,             placeholder: "Telegram: @username",        bg: "bg-blue-50" },
                    ].map(f => (
                      <div key={f.key} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${f.bg}`}>{f.icon}</div>
                        <input value={newOp[f.key]} onChange={e => setNewOp(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                          className={`flex-1 border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${inp}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddOp(false)} className={`flex-1 py-3 rounded-2xl border text-sm font-medium transition-colors ${dm ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Отмена</button>
                <button onClick={addOperator} className="flex-1 py-3 rounded-2xl bg-dark-900 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">Добавить</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset operator code modal */}
      <AnimatePresence>
        {resetResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setResetResult(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-[2rem] p-8 w-full max-w-sm mx-4 shadow-2xl text-center ${modal}`} onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-4"><KeyRound size={24} /></div>
              <h3 className={`font-bold text-lg mb-2 ${text}`}>Код сброшен</h3>
              <p className="text-sm text-slate-500 mb-4">Передайте этот временный код специалисту <strong>{resetResult.name}</strong>:</p>
              <div className={`rounded-2xl p-4 mb-6 border ${dm ? "bg-gray-700 border-gray-600" : "bg-slate-50 border-slate-200"}`}>
                <p className={`font-display text-3xl font-extrabold tracking-widest ${text}`}>{resetResult.code}</p>
                <p className="text-xs text-slate-400 mt-2">При входе специалист задаст новый личный код</p>
              </div>
              <button onClick={() => setResetResult(null)} className="w-full py-3 rounded-2xl bg-dark-900 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">Понятно</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset user password modal */}
      <AnimatePresence>
        {resetUserResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setResetUserResult(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-[2rem] p-8 w-full max-w-sm mx-4 shadow-2xl text-center ${modal}`} onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-4"><KeyRound size={24} /></div>
              <h3 className={`font-bold text-lg mb-2 ${text}`}>Пароль сброшен</h3>
              <p className="text-sm text-slate-500 mb-4">Передайте этот временный пароль сотруднику <strong>{resetUserResult.name}</strong>:</p>
              <div className={`rounded-2xl p-4 mb-2 border ${dm ? "bg-gray-700 border-gray-600" : "bg-slate-50 border-slate-200"}`}>
                <p className={`font-display text-2xl font-extrabold tracking-widest ${text}`}>{resetUserResult.password}</p>
              </div>
              <p className="text-xs text-slate-400 mb-6">После входа сотрудник может сменить пароль в настройках</p>
              <button onClick={() => setResetUserResult(null)} className="w-full py-3 rounded-2xl bg-dark-900 text-white text-sm font-semibold hover:bg-brand-600 transition-colors">Понятно</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
