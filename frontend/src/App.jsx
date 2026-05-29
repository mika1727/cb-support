import { useState, useEffect, useRef, createContext, useContext } from "react"
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { GoogleOAuthProvider } from "@react-oauth/google"
import {
  MessageSquare, Headphones, History, Bell, ShieldCheck, Zap, Server,
  ChevronRight, Loader2, Sparkles, LogOut, User, Shield, Settings, Menu, X
} from "lucide-react"
import ChatPage from "./components/ChatPage"
import OperatorPage from "./components/OperatorPage"
import HistoryPage from "./components/HistoryPage"
import SettingsPage from "./components/SettingsPage"
import OperatorPanelPage from "./components/OperatorPanelPage"
import LoginPage from "./components/LoginPage"
import MyRequestsPage from "./components/MyRequestsPage"

const GOOGLE_CLIENT_ID = "160623704521-9hqffab08sii634t2v6me6i8ubrdkk24.apps.googleusercontent.com"
const API = "https://cb-support-d6jb.onrender.com/api"

// ── Контекст темы и языка ─────────────────────────────────────────────────────
export const AppContext = createContext({
  darkMode: false, setDarkMode: () => {},
  language: "ru",  setLanguage: () => {},
})
export const useApp = () => useContext(AppContext)

// ── Переводы ──────────────────────────────────────────────────────────────────
export const T = {
  ru: {
    home: "Главная", chat: "ИИ-Чат", operator: "Оператор", history: "История",
    tickets: "Заявки", requests: "Обращения", login: "Войти", logout: "Выйти",
    settings: "Настройки", hero_title: "Ваш IT-помощник всегда на связи",
    hero_sub: "Мгновенные ответы от нейросети, бесшовное подключение операторов и полная история ваших обращений.",
    ask: "Задать вопрос", leave: "Оставить заявку", open_chat: "Открыть ИИ-Чат",
    need_help: "Нужна техническая поддержка?", describe: "Опишите вашу проблему нашему ИИ-ассистенту.",
    hello: "Привет",
  },
  en: {
    home: "Home", chat: "AI Chat", operator: "Operator", history: "History",
    tickets: "Tickets", requests: "Requests", login: "Login", logout: "Logout",
    settings: "Settings", hero_title: "Your IT assistant always online",
    hero_sub: "Instant AI answers, seamless operator handoff, and full history of your requests.",
    ask: "Ask a question", leave: "Submit a request", open_chat: "Open AI Chat",
    need_help: "Need technical support?", describe: "Describe your problem to our AI assistant.",
    hello: "Hello",
  },
  kz: {
    home: "Басты", chat: "ЖИ-Чат", operator: "Оператор", history: "Тарих",
    tickets: "Өтінімдер", requests: "Үндеулер", login: "Кіру", logout: "Шығу",
    settings: "Параметрлер", hero_title: "IT-көмекшіңіз әрқашан байланыста",
    hero_sub: "Жасанды интеллекттен жылдам жауаптар, операторға тікелей қосылу және барлық өтініштер тарихы.",
    ask: "Сұрақ қою", leave: "Өтінім қалдыру", open_chat: "ЖИ-чатты ашу",
    need_help: "Техникалық қолдау керек пе?", describe: "Мәселеңізді ЖИ-көмекшіге сипаттаңыз.",
    hello: "Сәлем",
  },
}

const NAV_LINKS_USER     = (t) => [{ label: t.home, to: "/" }, { label: t.chat, to: "/chat" }, { label: t.operator, to: "/operator" }, { label: t.history, to: "/history" }]
const NAV_LINKS_OPERATOR = (t) => [{ label: t.home, to: "/" }, { label: t.chat, to: "/chat" }, { label: t.tickets, to: "/operator-panel" }, { label: t.requests, to: "/my-requests" }]
const NAV_LINKS_ADMIN    = (t) => [{ label: t.home, to: "/" }, { label: t.chat, to: "/chat" }, { label: t.tickets, to: "/operator-panel" }, { label: t.requests, to: "/my-requests" }]

const FEATURES = (t) => [
  { icon: MessageSquare, title: "ИИ-ассистент",       desc: "Умный помощник на базе нейросети решает большинство технических вопросов без участия человека." },
  { icon: Headphones,    title: "Живой оператор",     desc: "Если вопрос сложный, заявка моментально переводится на свободного IT-специалиста." },
  { icon: History,       title: "История обращений",  desc: "Единая база всех ваших поломок и заявок. Легко найти статус или решение проблемы." },
  { icon: Bell,          title: "Push-уведомления",   desc: "Мгновенные оповещения о смене статуса заявки или ответе в чате. Вы всегда в курсе." },
]

const STATS = [
  { num: "98",  suffix: "%",  label: "Довольных сотрудников" },
  { num: "4",   suffix: "m",  label: "Среднее время решения" },
  { num: "24",  suffix: "/7", label: "Доступность сервиса"   },
  { num: "1.2", suffix: "k",  label: "Обращений решено"      },
]

// ── Avatar компонент ──────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-brand-500 to-accent-cyan",
  "from-accent-pink to-brand-400",
  "from-emerald-400 to-brand-500",
  "from-amber-400 to-accent-pink",
  "from-brand-600 to-accent-cyan",
  "from-slate-400 to-slate-600",
]
export function Avatar({ name, avatar, size = 7 }) {
  if (avatar) {
    return <img src={avatar} alt="" className={`w-${size} h-${size} rounded-full object-cover`} />
  }
  const letter  = name?.[0]?.toUpperCase() || "?"
  const idx     = (name?.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  const gradient = AVATAR_GRADIENTS[idx]
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-xs`}>
      {letter}
    </div>
  )
}

function Snow() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    let animId
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener("resize", resize)
    const flakes = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.5, speed: Math.random() * 0.5 + 0.2,
      wind: Math.random() * 0.3 - 0.15, opacity: Math.random() * 0.4 + 0.1,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      flakes.forEach(f => {
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139, 92, 246, ${f.opacity})`; ctx.fill()
        f.y += f.speed; f.x += f.wind
        if (f.y > canvas.height) { f.y = -5; f.x = Math.random() * canvas.width }
        if (f.x > canvas.width) f.x = 0
        if (f.x < 0) f.x = canvas.width
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />
}

function GlobalLoader() {
  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-dark-900">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-accent-pink/20 to-accent-cyan/20 opacity-50" />
      <motion.div animate={{ scale: [0.9, 1.1, 0.9], rotate: [0, 180, 360] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-brand-400 to-accent-cyan blur-md opacity-40 absolute" />
      <motion.div initial={{ y: 0 }} animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-20 flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-white/80 backdrop-blur-xl border border-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-brand-500/10">
          <Sparkles className="text-brand-500" size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-accent-cyan">CB-Support</h2>
        <div className="flex gap-1.5 mt-4">
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}   className="w-2 h-2 rounded-full bg-brand-400" />
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 rounded-full bg-brand-400" />
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 rounded-full bg-brand-400" />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Navbar({ user, onLogout }) {
  const { darkMode, language } = useApp()
  const t = T[language]
  const [scrolled, setScrolled]         = useState(false)
  const [showMenu, setShowMenu]         = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [unreadCount, setUnreadCount]   = useState(0)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", h)
    return () => window.removeEventListener("scroll", h)
  }, [])

  // Проверяем непрочитанные для операторов
  useEffect(() => {
    if (!user || (user.role !== "operator" && user.role !== "admin")) return
    const checkUnread = async () => {
      try {
        const res = await fetch(`${API}/tickets`)
        const data = await res.json()
        const myTickets = (data.tickets || []).filter(t =>
          t.operator_id && String(t.operator_id) === String(user.operatorId)
        )
        if (myTickets.length === 0) return
        const lastRead = JSON.parse(localStorage.getItem("cb_last_read") || "{}")
        let count = 0
        for (const ticket of myTickets) {
          const mRes = await fetch(`${API}/messages/${ticket.id}`)
          const mData = await mRes.json()
          const msgs = mData.messages || []
          const lr = lastRead[ticket.id] || 0
          count += msgs.filter(m => m.sender_role === "user" && new Date(m.created_at).getTime() > lr).length
        }
        setUnreadCount(count)
      } catch {}
    }
    checkUnread()
    const iv = setInterval(checkUnread, 15000)
    return () => clearInterval(iv)
  }, [user])

  const navLinks = user?.role === "admin" ? NAV_LINKS_ADMIN(t) : user?.role === "operator" ? NAV_LINKS_OPERATOR(t) : NAV_LINKS_USER(t)

  return (
    <>
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? darkMode ? "bg-gray-900/80 backdrop-blur-xl border-b border-gray-700 shadow-sm py-4"
                     : "bg-white/70 backdrop-blur-xl border-b border-white shadow-sm py-4"
          : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-accent-cyan text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-md shadow-brand-500/20">
              <Sparkles size={18} fill="currentColor" />
            </div>
            <span className={`font-display font-bold text-xl tracking-tight ${darkMode ? "text-white" : "text-dark-900"}`}>CB-Support</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <Link key={l.label} to={l.to} className={`text-sm font-medium transition-colors hover:text-brand-600 ${darkMode ? "text-gray-300" : "text-slate-600"}`}>{l.label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <Link to="/settings" className={`w-9 h-9 flex items-center justify-center rounded-2xl border shadow-sm transition-colors hover:text-brand-600 ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white/80 border-white text-slate-600 hover:bg-white"}`}>
                <Settings size={18} />
              </Link>
            )}

            {/* Уведомления для операторов */}
            {user && (user.role === "operator" || user.role === "admin") && (
              <Link to="/my-requests" className={`relative w-9 h-9 flex items-center justify-center rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300 hover:text-white" : "bg-white/80 border-white text-slate-600 hover:bg-white"}`}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button onClick={() => setShowMenu(v => !v)} className={`flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white/80 border-white hover:bg-white"}`}>
                  <Avatar name={user.name} avatar={user.avatar} size={5} />
                  <span className={`text-sm font-medium hidden sm:block ${darkMode ? "text-white" : "text-dark-900"}`}>{user.name?.split(" ")[0]}</span>
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className={`absolute right-0 top-full mt-2 rounded-2xl shadow-xl border p-2 min-w-[180px] z-50 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-100"}`}>
                      <div className={`px-3 py-2 border-b mb-1 ${darkMode ? "border-gray-700" : "border-slate-100"}`}>
                        <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-dark-900"}`}>{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block bg-brand-50 text-brand-600">
                          {user.role === "admin" ? "Администратор" : user.role === "operator" ? "Специалист" : "Сотрудник"}
                        </span>
                      </div>
                      <button onClick={() => { onLogout(); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 text-sm text-red-600 transition-colors">
                        <LogOut size={14} /> {t.logout}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="hidden sm:flex items-center gap-2 bg-dark-900 text-white px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-brand-600 transition-all active:scale-95 shadow-lg shadow-brand-500/20">
                {t.login}
              </Link>
            )}

            {/* Мобильное меню — гамбургер */}
            <button onClick={() => setShowMobileMenu(v => !v)}
              className={`md:hidden w-9 h-9 flex items-center justify-center rounded-2xl border shadow-sm transition-colors ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white/80 border-white text-slate-600"}`}>
              {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Мобильное меню (dropdown) */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`fixed top-[72px] left-0 right-0 z-40 mx-4 rounded-3xl border shadow-2xl p-4 md:hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-slate-100"}`}>
            {/* Ссылки навигации */}
            <div className="space-y-1 mb-3">
              {navLinks.map(l => (
                <Link key={l.label} to={l.to} onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${darkMode ? "text-gray-300 hover:bg-gray-700 hover:text-white" : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"}`}>
                  {l.label}
                </Link>
              ))}
            </div>
            {/* Разделитель */}
            <div className={`h-px mb-3 ${darkMode ? "bg-gray-700" : "bg-slate-100"}`} />
            {/* Настройки и выход */}
            {user ? (
              <div>
                <div className="flex items-center gap-3 px-4 py-3 mb-1">
                  <Avatar name={user.name} avatar={user.avatar} size={8} />
                  <div>
                    <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-dark-900"}`}>{user.name}</p>
                    <p className="text-xs text-slate-400">{user.role === "admin" ? "Администратор" : user.role === "operator" ? "Специалист" : "Сотрудник"}</p>
                  </div>
                </div>
                <Link to="/settings" onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${darkMode ? "text-gray-300 hover:bg-gray-700" : "text-slate-700 hover:bg-slate-50"}`}>
                  <Settings size={16} /> Настройки
                </Link>
                <button onClick={() => { onLogout(); setShowMobileMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={16} /> Выйти
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setShowMobileMenu(false)}
                className="flex items-center justify-center gap-2 bg-dark-900 text-white px-5 py-3 rounded-2xl text-sm font-medium hover:bg-brand-600 transition-all">
                {t.login}
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function HomePage({ user }) {
  const { darkMode, language } = useApp()
  const t = T[language]

  return (
    <div className={`min-h-screen font-sans selection:bg-brand-200 selection:text-brand-900 overflow-hidden relative ${darkMode ? "bg-gray-950 text-white" : ""}`}>
      <div className={`fixed inset-0 pointer-events-none z-[-1] ${darkMode ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" : "bg-gradient-to-br from-[#f8f6ff] via-[#fce7f3]/40 to-[#e0f2fe]/40"}`} />
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[10%] -left-[10%] w-[600px] h-[600px] rounded-full bg-accent-pink/30 blur-[120px]" />
        <div className="absolute top-[30%] -right-[15%] w-[800px] h-[800px] rounded-full bg-brand-300/20 blur-[150px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-accent-cyan/30 blur-[130px]" />
      </div>

      <section className="relative z-10 pt-40 pb-20 px-6 min-h-[95vh] flex items-center">
        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white text-brand-700 text-sm font-medium mb-6 shadow-sm">
              <Sparkles size={16} className="text-brand-500" />
              {user ? `${t.hello}, ${user.name?.split(" ")[0]}! 👋` : "Готов к будущему"}
            </div>
            <h1 className={`font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 ${darkMode ? "text-white" : "text-dark-900"}`}>
              {t.hero_title.split(" ").slice(0, 2).join(" ")} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-accent-cyan">{t.hero_title.split(" ").slice(2).join(" ")}</span>
            </h1>
            <p className={`text-lg mb-8 max-w-lg leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-600"}`}>{t.hero_sub}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/chat" className="bg-brand-500 text-white px-8 py-4 rounded-2xl font-medium shadow-xl shadow-brand-500/25 hover:bg-brand-400 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center gap-2">
                {t.ask} <ChevronRight size={18} />
              </Link>
              <Link to="/operator" className={`px-8 py-4 rounded-2xl font-medium backdrop-blur-md border hover:border-brand-200 transition-all shadow-sm ${darkMode ? "bg-gray-800/60 border-gray-700 text-white hover:bg-gray-800" : "bg-white/60 border-white text-slate-700 hover:bg-white"}`}>
                {t.leave}
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.4 }}
            className="relative lg:h-[600px] flex items-center justify-center p-8">
            <div className={`relative z-10 w-full max-w-md backdrop-blur-xl rounded-[2.5rem] border p-8 shadow-2xl shadow-brand-500/10 ${darkMode ? "bg-gray-800/70 border-gray-700" : "bg-white/70 border-white"}`}>
              <div className="mb-8 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-pink flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className={`font-display font-bold text-xl ${darkMode ? "text-white" : "text-dark-900"}`}>ИИ Ассистент</h3>
                  <p className="text-xs text-brand-600 font-medium tracking-wide uppercase mt-1">В сети</p>
                </div>
              </div>
              <div className="space-y-5">
                <div className={`rounded-2xl p-5 text-sm w-5/6 shadow-sm border ${darkMode ? "bg-gray-700 border-gray-600 text-gray-200" : "bg-slate-50/80 text-slate-700 border-slate-100/50"}`}>
                  Привет! У меня проблема с запуском Excel :(
                </div>
                <div className="bg-brand-500 text-white rounded-2xl p-5 text-sm shadow-md ml-auto w-11/12 shadow-brand-500/20">
                  Вижу ошибку подключения к службе лицензирования. Попробуйте запустить Excel от имени администратора.
                </div>
              </div>
            </div>
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -right-4 top-16 backdrop-blur-lg rounded-[2rem] p-5 shadow-xl border flex items-center gap-4 z-20 ${darkMode ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-white"}`}>
              <div className="bg-accent-mint text-emerald-600 p-3 rounded-2xl"><ShieldCheck size={24} /></div>
              <div className="pr-2">
                <p className="text-xs text-slate-400 font-medium">Статус</p>
                <p className={`font-bold text-sm ${darkMode ? "text-white" : "text-dark-900"}`}>Проблема решена</p>
              </div>
            </motion.div>
            <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-8 bottom-24 bg-dark-900 text-white rounded-[2rem] p-6 shadow-2xl border border-dark-800 z-20">
              <div className="flex items-center gap-3 mb-2">
                <Server size={18} className="text-accent-cyan" />
                <span className="font-medium text-sm text-slate-300">Время ответа</span>
              </div>
              <div className="font-display font-bold text-3xl tracking-tight">1.2<span className="text-lg text-slate-400">s</span></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className={`relative z-10 py-12 border-y ${darkMode ? "bg-gray-900/40 border-gray-700" : "bg-white/40 backdrop-blur-md border-white"}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-200/50">
          {STATS.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center px-4">
              <div className="font-display text-4xl lg:text-5xl font-extrabold text-brand-600 mb-2">{s.num}<span className="text-brand-300 ml-0.5">{s.suffix}</span></div>
              <div className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-slate-500"}`}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className={`font-display text-3xl md:text-4xl font-bold mb-4 ${darkMode ? "text-white" : "text-dark-900"}`}>Гармония формы и функций</h2>
            <p className={darkMode ? "text-gray-400" : "text-slate-600"}>Мы объединили мощь ИИ и опыт живых специалистов.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES(t).map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`backdrop-blur-xl rounded-[2rem] p-8 border shadow-lg hover:-translate-y-1 transition-all duration-300 group ${darkMode ? "bg-gray-800/60 border-gray-700" : "bg-white/60 border-white shadow-brand-500/5 hover:shadow-brand-500/10"}`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-pink/50 text-brand-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <f.icon size={26} />
                </div>
                <h3 className={`font-display font-bold text-lg mb-3 ${darkMode ? "text-white" : "text-dark-900"}`}>{f.title}</h3>
                <p className={`text-sm leading-relaxed ${darkMode ? "text-gray-400" : "text-slate-600"}`}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden border shadow-2xl shadow-brand-500/10 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gradient-to-br from-white to-brand-50 border-white"}`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent-pink/40 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-cyan/40 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <h2 className={`font-display text-4xl md:text-5xl font-bold mb-6 ${darkMode ? "text-white" : "text-dark-900"}`}>{t.need_help}</h2>
              <p className={`mb-10 max-w-xl mx-auto text-lg leading-relaxed ${darkMode ? "text-gray-300" : "text-slate-600"}`}>{t.describe}</p>
              <Link to="/chat" className="inline-flex items-center gap-2 bg-dark-900 text-white px-10 py-5 rounded-full font-medium shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all hover:scale-105 active:scale-95 text-lg">
                {t.open_chat} <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [loading, setLoading]   = useState(true)
  const [user, setUser]         = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cb_dark") === "true")
  const [language, setLanguage] = useState(() => localStorage.getItem("cb_lang") || "ru")

  useEffect(() => {
    const saved = localStorage.getItem("cb_user")
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { localStorage.removeItem("cb_user") }
    }
    const t = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add("dark") }
    else { document.documentElement.classList.remove("dark") }
    localStorage.setItem("cb_dark", darkMode)
  }, [darkMode])

  useEffect(() => { localStorage.setItem("cb_lang", language) }, [language])

  const handleLogin  = (userData) => setUser(userData)
  const handleLogout = () => { localStorage.removeItem("cb_user"); setUser(null) }

  const setDarkModeAndSave = (val) => {
    const next = typeof val === "function" ? val(darkMode) : val
    setDarkMode(next)
  }
  const setLanguageAndSave = (val) => {
    const next = typeof val === "function" ? val(language) : val
    setLanguage(next)
  }

  return (
    <AppContext.Provider value={{ darkMode, setDarkMode: setDarkModeAndSave, language, setLanguage: setLanguageAndSave }}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AnimatePresence>
          {loading && <GlobalLoader />}
        </AnimatePresence>
        <Snow />
        <BrowserRouter>
          <Navbar user={user} onLogout={handleLogout} />
          <Routes>
            <Route path="/"               element={<HomePage user={user} />} />
            <Route path="/login"          element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />} />
            <Route path="/chat"           element={<ChatPage user={user} />} />
            <Route path="/operator"       element={<OperatorPage user={user} />} />
            <Route path="/history"        element={<HistoryPage />} />
            <Route path="/operator-panel" element={(user?.role === "operator" || user?.role === "admin") ? <OperatorPanelPage user={user} /> : <Navigate to="/login" />} />
            <Route path="/my-requests"    element={(user?.role === "operator" || user?.role === "admin") ? <MyRequestsPage user={user} /> : <Navigate to="/" />} />
            <Route path="/settings"       element={<SettingsPage user={user} />} />
          </Routes>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </AppContext.Provider>
  )
}
