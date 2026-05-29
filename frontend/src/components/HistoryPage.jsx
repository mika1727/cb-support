import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Sparkles, Clock, CheckCircle2, AlertCircle, Search, ChevronRight } from "lucide-react"
import { useApp } from "../App"

const NAV_LINKS = [
  { label: "Главная", to: "/" },
  { label: "ИИ-Чат", to: "/chat" },
  { label: "Оператор", to: "/operator" },
  { label: "История", to: "/history" },
]

const ALL_TICKETS = [
  { id: "CB-1041", category: "Сеть и VPN",    title: "VPN не подключается из дома",      priority: "high",   status: "in_progress", operator: "Игорь В.",    time: "12 мин назад",  date: "23 апр 2026" },
  { id: "CB-1038", category: "Windows / ПК",  title: "Синий экран при загрузке",         priority: "normal", status: "waiting",      operator: null,          time: "1 час назад",   date: "23 апр 2026" },
  { id: "CB-1035", category: "Программы",     title: "1C не открывает базу данных",      priority: "normal", status: "resolved",     operator: "Анна М.",     time: "3 часа назад",  date: "23 апр 2026" },
  { id: "CB-1030", category: "Почта",         title: "Outlook не синхронизирует почту",  priority: "low",    status: "resolved",     operator: "Анна М.",     time: "Вчера",         date: "22 апр 2026" },
  { id: "CB-1025", category: "Доступы",       title: "Нет доступа к папке на сервере",   priority: "high",   status: "resolved",     operator: "Дмитрий К.",  time: "2 дня назад",   date: "21 апр 2026" },
  { id: "CB-1019", category: "Оборудование",  title: "Принтер не печатает с ноутбука",   priority: "low",    status: "resolved",     operator: "Светлана Р.", time: "5 дней назад",  date: "18 апр 2026" },
]

const statusMap = {
  in_progress: { label: "В работе", cls: "bg-brand-50 text-brand-600 border-brand-200",       Icon: Clock        },
  waiting:     { label: "Ожидает",  cls: "bg-amber-50 text-amber-600 border-amber-200",        Icon: AlertCircle  },
  resolved:    { label: "Решено",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200",  Icon: CheckCircle2 },
}
const priorityDot = { high: "bg-red-400", normal: "bg-amber-400", low: "bg-emerald-400" }
const filterLabels = { all: "Все", in_progress: "В работе", waiting: "Ожидает", resolved: "Решено" }

export default function HistoryPage() {
  const { darkMode } = useApp()
  const [filter, setFilter] = useState("all")
  const [search, setSearch]   = useState("")

  const filtered = ALL_TICKETS.filter(t => {
    const matchF = filter === "all" || t.status === filter
    const matchS = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
    return matchF && matchS
  })

  const dm   = darkMode
  const bg   = dm ? "bg-gray-950"  : "bg-gradient-to-br from-[#f8f6ff] via-[#fce7f3]/40 to-[#e0f2fe]/40"
  const text = dm ? "text-white"   : "text-dark-900"
  const sub  = dm ? "text-gray-400": "text-slate-600"
  const card = dm ? "bg-gray-800/60 border-gray-700 hover:shadow-brand-500/10" : "bg-white/60 border-white shadow-brand-500/5 hover:shadow-brand-500/10"
  const inp  = dm ? "bg-gray-800/70 border-gray-700 text-white placeholder:text-gray-500" : "bg-white/70 border-white text-dark-900 placeholder:text-slate-400"

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden relative transition-colors duration-300 ${dm ? bg : ""}`}>
      <div className={`fixed inset-0 pointer-events-none z-[-1] ${dm ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" : bg}`} />
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[5%] -right-[10%] w-[600px] h-[600px] rounded-full bg-accent-pink/25 blur-[130px]" />
        <div className="absolute -bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-accent-cyan/30 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-brand-300/20 blur-[100px]" />
      </div>

      <div className="relative z-10 pt-28">
        <section className="max-w-5xl mx-auto px-6 pt-12 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white text-brand-700 text-sm font-medium mb-5 shadow-sm">
              <Clock size={16} className="text-brand-500" />
              История обращений
            </div>
            <h1 className={`font-display text-5xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight mb-4 ${text}`}>
              Все ваши<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-cyan">заявки</span>
            </h1>
            <p className={`max-w-lg leading-relaxed ${sub}`}>Единая история обращений — легко найти статус, решение или переоткрыть задачу.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по заявкам..."
                className={`w-full pl-10 pr-4 py-3 rounded-2xl backdrop-blur-md border text-sm focus:outline-none focus:border-brand-400 shadow-sm transition-colors font-medium ${inp}`} />
            </div>
            <div className="flex gap-2 shrink-0">
              {Object.entries(filterLabels).map(([k, v]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-4 py-3 rounded-2xl text-sm font-semibold transition-all border ${filter === k ? "bg-dark-900 text-white border-dark-900 shadow-md" : dm ? "bg-gray-800/60 border-gray-700 text-gray-300 hover:border-brand-400" : "bg-white/60 backdrop-blur-md border-white text-slate-600 hover:border-brand-200"}`}>
                  {v}
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Всего заявок", val: ALL_TICKETS.length },
              { label: "В работе",     val: ALL_TICKETS.filter(t => t.status !== "resolved").length },
              { label: "Решено",       val: ALL_TICKETS.filter(t => t.status === "resolved").length },
            ].map((s, i) => (
              <div key={i} className={`backdrop-blur-xl rounded-2xl p-5 border shadow-md text-center ${card}`}>
                <div className={`font-display text-3xl font-extrabold ${text}`}>{s.val}</div>
                <div className={`text-xs font-medium mt-1 ${dm ? "text-gray-400" : "text-slate-400"}`}>{s.label}</div>
              </div>
            ))}
          </motion.div>

          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-slate-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-medium">Заявок не найдено</p>
              <p className="text-sm mt-1">Попробуйте изменить поиск или фильтр</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((t, i) => {
                const st = statusMap[t.status]
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
                    className={`group backdrop-blur-xl rounded-2xl p-5 border shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200 flex items-center gap-5 ${card}`}>
                    <div className={`w-3 h-3 rounded-full shrink-0 ${priorityDot[t.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">{t.id}</span>
                        <span className="text-xs text-slate-400">{t.category}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{t.date}</span>
                      </div>
                      <p className={`text-sm font-semibold truncate ${text}`}>{t.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{t.operator ? `👤 ${t.operator} · ` : "🤖 ИИ-чат · "}{t.time}</p>
                    </div>
                    <span className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${st.cls}`}>
                      <st.Icon size={12} /> {st.label}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-brand-400 transition-colors shrink-0" />
                  </motion.div>
                )
              })}
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className={`mt-12 rounded-[2rem] p-10 text-center border shadow-xl shadow-brand-500/10 relative overflow-hidden ${dm ? "bg-gray-800 border-gray-700" : "bg-gradient-to-br from-white to-brand-50 border-white"}`}>
            <div className="absolute top-0 right-0 w-72 h-72 bg-accent-pink/30 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent-cyan/30 rounded-full blur-[70px]" />
            <div className="relative z-10">
              <h3 className={`font-display text-2xl font-bold mb-3 ${text}`}>Нужна помощь?</h3>
              <p className={`mb-6 text-sm leading-relaxed max-w-sm mx-auto ${sub}`}>Создайте новую заявку или задайте вопрос нашему ИИ-ассистенту прямо сейчас.</p>
              <div className="flex justify-center gap-4">
                <Link to="/operator" className="flex items-center gap-2 bg-dark-900 text-white px-6 py-3.5 rounded-2xl font-medium shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all hover:-translate-y-0.5 text-sm">
                  + Создать заявку
                </Link>
                <Link to="/chat" className={`px-6 py-3.5 rounded-2xl font-medium backdrop-blur-md border hover:border-brand-200 transition-all shadow-sm text-sm ${dm ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600" : "bg-white/70 border-white text-slate-700 hover:bg-white"}`}>
                  🤖 ИИ-чат
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        <footer className="relative z-10 bg-dark-900">
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