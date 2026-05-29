import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft, Trash2, Bell, Moon, Globe, Shield, ChevronRight,
  CheckCircle2, Search, Clock, AlertCircle, X, Eye, EyeOff,
  Lock, User, Mail, KeyRound, TrendingUp, BarChart2
} from "lucide-react"
import { useApp } from "../App"

const SESSIONS_KEY = "cb_sessions"
const API = "https://cb-support-d6jb.onrender.com/apii"

const STATUS_MAP = {
  open:        { label: "Открыт",   cls: "bg-blue-50 text-blue-600 border-blue-200",         Icon: AlertCircle  },
  in_progress: { label: "В работе", cls: "bg-brand-50 text-brand-600 border-brand-200",       Icon: Clock        },
  resolved:    { label: "Решено",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200", Icon: CheckCircle2 },
  closed:      { label: "Закрыт",   cls: "bg-slate-50 text-slate-500 border-slate-200",       Icon: X            },
}

const STATUS_LABELS = { open: "Открыт", in_progress: "В работе", resolved: "Решено", closed: "Закрыт" }
const PRIORITY_COLORS = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-emerald-400" }

// ── Компонент статистики для администратора ───────────────────────────────────
function StatsSection({ darkMode }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/auth/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dm = darkMode
  const card = dm ? "bg-gray-700 border-gray-600" : "bg-white border-slate-100"
  const text = dm ? "text-white" : "text-dark-900"

  if (loading) return <div className="text-center py-8 text-slate-400 text-sm">Загрузка статистики...</div>
  if (!stats)  return <div className="text-center py-8 text-slate-400 text-sm">Нет данных</div>

  const maxDay = Math.max(...(stats.byDay || []).map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Карточки итогов */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Всего заявок",  val: stats.total,                                                    color: "text-brand-600"   },
          { label: "Решено",        val: (stats.byStatus || []).find(s => s.name === "resolved")?.count || 0, color: "text-emerald-600" },
          { label: "В работе",      val: (stats.byStatus || []).find(s => s.name === "in_progress")?.count || 0, color: "text-amber-600"   },
          { label: "Среднее время", val: stats.avgResolutionHours != null ? `${stats.avgResolutionHours}ч` : "—", color: "text-blue-600" },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl p-4 border text-center ${card}`}>
            <div className={`font-display text-2xl font-extrabold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* График по дням (30 дней) */}
      {stats.byDay?.length > 0 && (
        <div className={`rounded-2xl p-4 border ${card}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${dm ? "text-gray-400" : "text-slate-400"}`}>
            Заявки за 30 дней
          </p>
          <div className="flex items-end gap-1 h-24">
            {stats.byDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t-sm bg-brand-400 hover:bg-brand-500 transition-colors cursor-default"
                  style={{ height: `${Math.max((d.count / maxDay) * 88, d.count > 0 ? 4 : 0)}px` }}
                  title={`${d.date}: ${d.count}`}
                />
                {/* Tooltip */}
                {d.count > 0 && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-dark-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                    {d.count}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-400">{stats.byDay[0]?.date?.slice(5)}</span>
            <span className="text-xs text-slate-400">{stats.byDay[stats.byDay.length - 1]?.date?.slice(5)}</span>
          </div>
        </div>
      )}

      {/* По категориям */}
      {stats.byCategory?.length > 0 && (
        <div className={`rounded-2xl p-4 border ${card}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${dm ? "text-gray-400" : "text-slate-400"}`}>
            По категориям
          </p>
          <div className="space-y-3">
            {stats.byCategory.slice(0, 7).map((c, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className={`text-xs font-medium truncate max-w-[70%] ${text}`}>{c.name || "Другое"}</span>
                  <span className="text-xs text-slate-400">{c.count}</span>
                </div>
                <div className={`w-full h-2 rounded-full ${dm ? "bg-gray-600" : "bg-slate-100"}`}>
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-cyan transition-all duration-500"
                    style={{ width: `${(c.count / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* По приоритетам */}
      {stats.byPriority?.length > 0 && (
        <div className={`rounded-2xl p-4 border ${card}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${dm ? "text-gray-400" : "text-slate-400"}`}>
            По приоритетам
          </p>
          <div className="flex gap-3 flex-wrap">
            {stats.byPriority.map((p, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${dm ? "bg-gray-600 border-gray-500" : "bg-slate-50 border-slate-100"}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_COLORS[p.name] || "bg-slate-300"}`} />
                <span className={`text-xs font-medium ${text}`}>
                  {p.name === "high" ? "Срочно" : p.name === "medium" ? "Обычный" : "Низкий"}
                </span>
                <span className="text-xs font-bold text-brand-600">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PrivacyModal ──────────────────────────────────────────────────────────────
function PrivacyModal({ user, onClose, darkMode, onUserUpdate }) {
  const [showPass, setShowPass]               = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [success, setSuccess]                 = useState("")
  const [error, setError]                     = useState("")
  const [oldPassword, setOldPassword]         = useState("")
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [oldCode, setOldCode]                 = useState("")
  const [newCode, setNewCode]                 = useState("")
  const [confirmCode, setConfirmCode]         = useState("")
  // Для установки пароля Google-пользователем в настройках
  const [setPassNew, setSetPassNew]           = useState("")
  const [setPassConfirm, setSetPassConfirm]   = useState("")

  const isOperator  = user?.role === "operator" || user?.role === "admin"
  const isGoogle    = user?.provider === "google"
  const hasPassword = !!(user?.hasPassword)

  const changePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) { setError("Заполните все поля"); return }
    if (newPassword !== confirmPassword) { setError("Пароли не совпадают"); return }
    if (newPassword.length < 6) { setError("Минимум 6 символов"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: localStorage.getItem("cb_token"), oldPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess("Пароль успешно изменён!")
      setOldPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  const setGooglePassword = async () => {
    if (!setPassNew || setPassNew.length < 6) { setError("Пароль минимум 6 символов"); return }
    if (setPassNew !== setPassConfirm) { setError("Пароли не совпадают"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: localStorage.getItem("cb_token"), password: setPassNew, confirmPassword: setPassConfirm }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess("Пароль установлен! Теперь можно входить по email.")
      setSetPassNew(""); setSetPassConfirm("")
      // Обновляем данные пользователя в localStorage
      const saved = JSON.parse(localStorage.getItem("cb_user") || "{}")
      saved.hasPassword = true
      localStorage.setItem("cb_user", JSON.stringify(saved))
      if (onUserUpdate) onUserUpdate({ ...saved, hasPassword: true })
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  const changeCode = async () => {
    if (!oldCode || !newCode || !confirmCode) { setError("Заполните все поля"); return }
    if (newCode !== confirmCode) { setError("Коды не совпадают"); return }
    if (newCode.length < 4) { setError("Минимум 4 символа"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/auth/operator-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: localStorage.getItem("cb_token"), code: oldCode, newCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess("Код доступа успешно изменён!")
      setOldCode(""); setNewCode(""); setConfirmCode("")
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  const dm = darkMode
  const inputCls = `w-full pl-10 pr-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${dm ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "border-slate-200"}`
  const text = dm ? "text-white" : "text-dark-900"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-[2rem] p-8 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto ${dm ? "bg-gray-800" : "bg-white"}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`font-bold text-xl ${text}`}>Данные и приватность</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-dark-900"><X size={18} /></button>
        </div>

        {/* Данные пользователя */}
        <div className={`rounded-2xl p-4 mb-6 ${dm ? "bg-gray-700" : "bg-slate-50"}`}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Ваши данные</p>
          <div className="space-y-2">
            {[
              { icon: User,   label: "Имя",   val: user?.name },
              { icon: Mail,   label: "Email", val: user?.email },
              { icon: Shield, label: "Роль",  val: user?.role === "admin" ? "Администратор" : user?.role === "operator" ? "Специалист" : "Сотрудник" },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><Icon size={14} /></div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={`text-sm font-semibold ${text}`}>{val || "—"}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Badges провайдера */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {isGoogle && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Google</span>}
            {hasPassword && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">+ Пароль</span>}
            {!isGoogle && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Email/Пароль</span>}
          </div>
        </div>

        {/* Специалист/Админ: смена кода */}
        {isOperator && (
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Сменить код доступа</p>
            <div className="space-y-3">
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={oldCode} onChange={e => { setOldCode(e.target.value); setError(""); setSuccess("") }} placeholder="Текущий код" className={inputCls} /></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={newCode} onChange={e => { setNewCode(e.target.value); setError(""); setSuccess("") }} placeholder="Новый код (минимум 4 символа)" className={`${inputCls} pr-12`} />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={confirmCode} onChange={e => { setConfirmCode(e.target.value); setError(""); setSuccess("") }} placeholder="Повторите новый код" className={inputCls} /></div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              {success && <p className="text-emerald-600 text-xs font-medium">{success}</p>}
              <button onClick={changeCode} disabled={loading} className="w-full py-3 rounded-2xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50">
                {loading ? "Сохранение..." : "Сменить код"}
              </button>
            </div>
          </div>
        )}

        {/* Google-пользователь БЕЗ пароля — предлагаем установить */}
        {!isOperator && isGoogle && !hasPassword && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={14} className="text-brand-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Добавить пароль</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">Установите пароль, чтобы также входить по email и паролю, не только через Google.</p>
            <div className="space-y-3">
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={setPassNew} onChange={e => { setSetPassNew(e.target.value); setError(""); setSuccess("") }}
                  placeholder="Новый пароль (минимум 6 символов)" className={`${inputCls} pr-12`} />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={setPassConfirm} onChange={e => { setSetPassConfirm(e.target.value); setError(""); setSuccess("") }}
                  placeholder="Повторите пароль" className={inputCls} /></div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              {success && <p className="text-emerald-600 text-xs font-medium">{success}</p>}
              <button onClick={setGooglePassword} disabled={loading} className="w-full py-3 rounded-2xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50">
                {loading ? "Сохранение..." : "Установить пароль"}
              </button>
            </div>
          </div>
        )}

        {/* Google-пользователь С паролем — может сменить */}
        {!isOperator && isGoogle && hasPassword && (
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Сменить пароль</p>
            <div className="space-y-3">
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={oldPassword} onChange={e => { setOldPassword(e.target.value); setError(""); setSuccess("") }} placeholder="Текущий пароль" className={inputCls} /></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(""); setSuccess("") }} placeholder="Новый пароль (минимум 6 символов)" className={`${inputCls} pr-12`} />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(""); setSuccess("") }} placeholder="Повторите новый пароль" className={inputCls} /></div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              {success && <p className="text-emerald-600 text-xs font-medium">{success}</p>}
              <button onClick={changePassword} disabled={loading} className="w-full py-3 rounded-2xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50">
                {loading ? "Сохранение..." : "Сменить пароль"}
              </button>
            </div>
          </div>
        )}

        {/* Local-пользователь: смена пароля */}
        {!isOperator && !isGoogle && (
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Сменить пароль</p>
            <div className="space-y-3">
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={oldPassword} onChange={e => { setOldPassword(e.target.value); setError(""); setSuccess("") }} placeholder="Текущий пароль" className={inputCls} /></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(""); setSuccess("") }} placeholder="Новый пароль (минимум 6 символов)" className={`${inputCls} pr-12`} />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
              <div className="relative"><Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(""); setSuccess("") }} placeholder="Повторите новый пароль" className={inputCls} /></div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              {success && <p className="text-emerald-600 text-xs font-medium">{success}</p>}
              <button onClick={changePassword} disabled={loading} className="w-full py-3 rounded-2xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50">
                {loading ? "Сохранение..." : "Сменить пароль"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Главная страница настроек ─────────────────────────────────────────────────
export default function SettingsPage({ user }) {
  const { darkMode, setDarkMode, language, setLanguage } = useApp()
  const [cleared, setCleared]             = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [allTickets, setAllTickets]       = useState([])
  const [search, setSearch]               = useState("")
  const [showHistory, setShowHistory]     = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [showPrivacy, setShowPrivacy]     = useState(false)
  const [showStats, setShowStats]         = useState(false)
  const [currentUser, setCurrentUser]     = useState(user)

  const clearHistory = () => {
    localStorage.removeItem(SESSIONS_KEY)
    setCleared(true)
    setTimeout(() => setCleared(false), 3000)
  }

  const loadTickets = async () => {
    setLoadingTickets(true)
    setShowHistory(true)
    try {
      const res = await fetch(`${API}/tickets`)
      const data = await res.json()
      setAllTickets(data.tickets || [])
    } catch (e) { console.error(e) }
    finally { setLoadingTickets(false) }
  }

  const filtered = allTickets.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.title?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      String(t.id).includes(q) ||
      t.user_name?.toLowerCase().includes(q)
    )
  })

  const formatTime = (iso) => iso ? new Date(iso).toLocaleString("ru-RU") : ""

  const dm    = darkMode
  const bg    = dm ? "bg-gray-900"     : "bg-[#fdfcff]"
  const card  = dm ? "bg-gray-800/70 border-gray-700" : "bg-white/70 border-white"
  const text  = dm ? "text-white"      : "text-dark-900"
  const sub   = dm ? "text-gray-400"   : "text-slate-400"
  const inp   = dm ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "border-slate-200 bg-white"

  const Toggle = ({ val, onChange }) => (
    <button onClick={() => onChange(v => !v)}
      className={`w-12 h-6 rounded-full transition-colors relative ${val ? "bg-brand-500" : "bg-slate-200"}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${val ? "left-7" : "left-1"}`} />
    </button>
  )

  const SETTINGS = [
    {
      section: "Уведомления",
      items: [{
        icon: Bell, label: "Push-уведомления", desc: "Получать уведомления о статусе заявок",
        action: <Toggle val={notifications} onChange={setNotifications} />
      }]
    },
    {
      section: "Внешний вид",
      items: [
        {
          icon: Moon, label: "Тёмная тема", desc: "Переключить тёмный режим",
          action: <Toggle val={darkMode} onChange={setDarkMode} />
        },
        {
          icon: Globe, label: "Язык", desc: "Язык интерфейса",
          action: (
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className={`text-sm font-medium border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 ${dm ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-slate-200 text-dark-900"}`}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kz">Қазақша</option>
            </select>
          )
        },
      ]
    },
    {
      section: "Конфиденциальность",
      items: [{
        icon: Shield, label: "Данные и приватность", desc: "Управление данными и паролем",
        action: (
          <button onClick={() => setShowPrivacy(true)} className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:text-brand-700">
            Открыть <ChevronRight size={14} />
          </button>
        )
      }]
    },
  ]

  return (
    <div className={`min-h-screen font-sans relative transition-colors duration-300 ${bg}`}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#fbcfe8]/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#ddd6fe]/50 blur-[130px]" />
      </div>

      <AnimatePresence>
        {showPrivacy && (
          <PrivacyModal
            user={currentUser}
            onClose={() => setShowPrivacy(false)}
            darkMode={darkMode}
            onUserUpdate={setCurrentUser}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-10 pt-24">
        <div className="flex items-center gap-4 mb-10">
          <Link to="/" className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-colors border ${dm ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-100 text-dark-900 hover:bg-slate-50"}`}>
            <ChevronLeft size={20} />
          </Link>
          <h1 className={`font-display font-bold text-2xl ${text}`}>Настройки</h1>
        </div>

        <div className="space-y-6">
          {SETTINGS.map((section) => (
            <motion.div key={section.section} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className={`backdrop-blur-xl rounded-3xl border shadow-lg shadow-brand-500/5 overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b ${dm ? "border-gray-700" : "border-slate-100"}`}>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{section.section}</h2>
              </div>
              <div className={`divide-y ${dm ? "divide-gray-700" : "divide-slate-100"}`}>
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${text}`}>{item.label}</p>
                      <p className={`text-xs mt-0.5 ${sub}`}>{item.desc}</p>
                    </div>
                    {item.action}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Статистика заявок — только для admin */}
          {currentUser?.role === "admin" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className={`backdrop-blur-xl rounded-3xl border shadow-lg shadow-brand-500/5 overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex items-center justify-between ${dm ? "border-gray-700" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <BarChart2 size={14} className="text-brand-500" />
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Статистика заявок</h2>
                </div>
                <button onClick={() => setShowStats(v => !v)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100 transition-all">
                  {showStats ? "Свернуть" : "Показать"}
                </button>
              </div>
              {showStats && (
                <div className="px-6 py-4">
                  <StatsSection darkMode={darkMode} />
                </div>
              )}
            </motion.div>
          )}

          {/* История заявок — для operator и admin */}
          {(currentUser?.role === "operator" || currentUser?.role === "admin") && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className={`backdrop-blur-xl rounded-3xl border shadow-lg shadow-brand-500/5 overflow-hidden ${card}`}>
              <div className={`px-6 py-4 border-b flex items-center justify-between ${dm ? "border-gray-700" : "border-slate-100"}`}>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">История всех заявок</h2>
                <div className="flex gap-2">
                  {showHistory && (
                    <button onClick={() => setShowHistory(false)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${dm ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                      Свернуть
                    </button>
                  )}
                  <button onClick={loadTickets}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-100 transition-all">
                    {showHistory ? "Обновить" : "Показать"}
                  </button>
                </div>
              </div>
              {showHistory && (
                <div className="px-6 py-4">
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по заявкам..."
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${inp}`} />
                  </div>
                  {loadingTickets ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Загрузка...</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Заявок не найдено</div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                      {filtered.map(t => {
                        const st = STATUS_MAP[t.status] || STATUS_MAP.open
                        return (
                          <div key={t.id} className={`rounded-2xl p-4 border shadow-sm ${dm ? "bg-gray-700 border-gray-600" : "bg-white border-slate-100"}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg">#{t.id}</span>
                                  <span className="text-xs text-slate-400">{t.category}</span>
                                  {t.user_name && <span className="text-xs text-slate-500">👤 {t.user_name}</span>}
                                </div>
                                <p className={`text-sm font-semibold truncate ${text}`}>{t.title}</p>
                                <p className="text-xs text-slate-400 mt-1">{formatTime(t.created_at)}</p>
                              </div>
                              <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${st.cls}`}>
                                <st.Icon size={11} /> {st.label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Всего заявок: {allTickets.length} · Показано: {filtered.length}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* История чатов */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`backdrop-blur-xl rounded-3xl border shadow-lg shadow-brand-500/5 overflow-hidden ${card}`}>
            <div className={`px-6 py-4 border-b ${dm ? "border-gray-700" : "border-slate-100"}`}>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">История чатов</h2>
            </div>
            <div className="px-6 py-5">
              <p className={`text-sm mb-4 ${sub}`}>Удалить всю историю чатов из памяти устройства. Это действие нельзя отменить.</p>
              <button onClick={clearHistory}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  cleared ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                }`}>
                {cleared ? <><CheckCircle2 size={16} /> Очищено!</> : <><Trash2 size={16} /> Очистить всю историю</>}
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`backdrop-blur-xl rounded-3xl border shadow-lg shadow-brand-500/5 px-6 py-5 text-center ${card}`}>
            <p className={`text-sm font-bold ${text}`}>CB-Support</p>
            <p className="text-xs text-slate-400 mt-1">Версия 1.0.0 · © 2026</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
