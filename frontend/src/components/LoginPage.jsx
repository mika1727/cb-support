import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { GoogleLogin } from "@react-oauth/google"
import { Sparkles, Shield, User, Eye, EyeOff, Mail, Lock, ArrowLeft, KeyRound } from "lucide-react"
import { useApp } from "../App"

const API ="https://cb-support-d6jb.onrender.com/api"

export default function LoginPage({ onLogin }) {
  const { darkMode } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState("role")
  const [role, setRole] = useState(null)
  const [authMode, setAuthMode] = useState("login")
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [operatorCode, setOperatorCode] = useState("")
  const [pendingUser, setPendingUser] = useState(null)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [newCode, setNewCode] = useState("")
  const [confirmNewCode, setConfirmNewCode] = useState("")
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  // Для установки пароля Google-пользователем
  const [googlePassword, setGooglePassword] = useState("")
  const [googlePasswordConfirm, setGooglePasswordConfirm] = useState("")
  const [googleToken, setGoogleToken] = useState(null)
  const [googleUserData, setGoogleUserData] = useState(null)

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError("") }

  const dm = darkMode
  const cardCls = `${dm ? "bg-gray-800/90 border-gray-700" : "bg-white/80 border-white"} backdrop-blur-xl rounded-[2rem] p-8 border shadow-2xl`
  const inputCls = `w-full border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 ${dm ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "border-slate-200"}`
  const textMain = dm ? "text-white" : "text-dark-900"
  const textSub  = dm ? "text-gray-400" : "text-slate-400"

  const handleGoogleSuccess = async (credentialResponse) => {
    const base64 = credentialResponse.credential.split(".")[1]
    const info = JSON.parse(atob(base64))
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleId: info.sub, name: info.name, email: info.email, avatar: info.picture }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      if (role === "operator") {
        setPendingUser({ ...data.user, token: data.token })
        setStep("operator-code")
      } else {
        // Новый Google-пользователь — предлагаем установить пароль
        if (data.isNewUser) {
          setGoogleToken(data.token)
          setGoogleUserData(data.user)
          setStep("set-google-password")
        } else {
          localStorage.setItem("cb_token", data.token)
          localStorage.setItem("cb_user", JSON.stringify(data.user))
          onLogin(data.user)
          navigate("/")
        }
      }
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  const handleEmailAuth = async () => {
    setError("")
    if (authMode === "register") {
      if (!form.name || !form.email || !form.password) { setError("Заполните все поля"); return }
      if (form.password !== form.confirmPassword) { setError("Пароли не совпадают"); return }
      if (form.password.length < 6) { setError("Пароль минимум 6 символов"); return }
    } else {
      if (!form.email || !form.password) { setError("Введите email и пароль"); return }
    }
    setLoading(true)
    try {
      const endpoint = authMode === "register" ? "register" : "login"
      const res = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (role === "operator") {
        setPendingUser({ ...data.user, token: data.token })
        setStep("operator-code")
      } else {
        localStorage.setItem("cb_token", data.token)
        localStorage.setItem("cb_user", JSON.stringify(data.user))
        onLogin(data.user)
        navigate("/")
      }
    } catch { setError("Ошибка соединения с сервером") }
    finally { setLoading(false) }
  }

  const verifyOperatorCode = async () => {
    if (!operatorCode) { setError("Введите код"); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/operator-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUser.token, code: operatorCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.firstLogin) {
        setStep("set-code")
      } else {
        const user = { ...pendingUser, role: data.isAdmin ? "admin" : "operator", operatorId: data.operatorId || null }
        localStorage.setItem("cb_token", pendingUser.token)
        localStorage.setItem("cb_user", JSON.stringify(user))
        onLogin(user)
        navigate("/operator-panel")
      }
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  const saveNewCode = async () => {
    if (!newCode || newCode.length < 4) { setError("Код минимум 4 символа"); return }
    if (newCode !== confirmNewCode) { setError("Коды не совпадают"); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/operator-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingUser.token, code: operatorCode, newCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      const user = { ...pendingUser, role: "operator" }
      localStorage.setItem("cb_token", pendingUser.token)
      localStorage.setItem("cb_user", JSON.stringify(user))
      onLogin(user)
      navigate("/operator-panel")
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  // Установка пароля для нового Google-пользователя
  const saveGooglePassword = async () => {
    if (!googlePassword || googlePassword.length < 6) { setError("Пароль минимум 6 символов"); return }
    if (googlePassword !== googlePasswordConfirm) { setError("Пароли не совпадают"); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: googleToken, password: googlePassword, confirmPassword: googlePasswordConfirm }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      localStorage.setItem("cb_token", googleToken)
      localStorage.setItem("cb_user", JSON.stringify(googleUserData))
      onLogin(googleUserData)
      navigate("/")
    } catch { setError("Ошибка соединения") }
    finally { setLoading(false) }
  }

  const skipGooglePassword = () => {
    localStorage.setItem("cb_token", googleToken)
    localStorage.setItem("cb_user", JSON.stringify(googleUserData))
    onLogin(googleUserData)
    navigate("/")
  }

  return (
    <div className={`min-h-screen font-sans flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${dm ? "bg-gray-950" : "bg-[#fdfcff]"}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#fbcfe8]/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#ddd6fe]/50 blur-[130px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-500 to-accent-cyan text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/30">
            <Sparkles size={28} fill="currentColor" />
          </div>
          <h1 className={`font-display font-bold text-3xl ${textMain}`}>CB-Support</h1>
          <p className={`text-sm mt-1 ${textSub}`}>Корпоративная IT-поддержка</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "role" && (
            <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
              <h2 className={`font-display font-bold text-xl mb-2 text-center ${textMain}`}>Добро пожаловать</h2>
              <p className={`text-sm text-center mb-8 ${textSub}`}>Выберите как вы хотите войти</p>
              <div className="space-y-4">
                <button onClick={() => { setRole("user"); setStep("auth") }}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 hover:border-brand-300 hover:bg-brand-50/50 transition-all group text-left ${dm ? "border-gray-700 hover:bg-brand-900/20" : "border-slate-100"}`}>
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform flex-shrink-0">
                    <User size={22} />
                  </div>
                  <div>
                    <p className={`font-bold ${textMain}`}>Сотрудник</p>
                    <p className={`text-xs mt-0.5 ${textSub}`}>Создавать заявки и общаться с ИИ</p>
                  </div>
                </button>
                <button onClick={() => { setRole("operator"); setStep("auth") }}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 hover:border-brand-300 hover:bg-brand-50/50 transition-all group text-left ${dm ? "border-gray-700 hover:bg-brand-900/20" : "border-slate-100"}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 ${dm ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-600"}`}>
                    <Shield size={22} />
                  </div>
                  <div>
                    <p className={`font-bold ${textMain}`}>Специалист</p>
                    <p className={`text-xs mt-0.5 ${textSub}`}>Обрабатывать заявки и помогать сотрудникам</p>
                  </div>
                </button>
                <button onClick={() => { setRole("operator"); setStep("auth") }}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 hover:border-amber-300 hover:bg-amber-50/50 transition-all group text-left ${dm ? "border-gray-700 hover:bg-amber-900/20" : "border-slate-100"}`}>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0">
                    <Shield size={22} />
                  </div>
                  <div>
                    <p className={`font-bold ${textMain}`}>Администратор</p>
                    <p className={`text-xs mt-0.5 ${textSub}`}>Управление специалистами и системой</p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === "auth" && (
            <motion.div key="auth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
              <button onClick={() => setStep("role")} className={`flex items-center gap-2 text-sm mb-6 transition-colors ${dm ? "text-gray-400 hover:text-white" : "text-slate-400 hover:text-dark-900"}`}>
                <ArrowLeft size={16} /> Назад
              </button>
              <div className={`flex rounded-2xl p-1 mb-6 ${dm ? "bg-gray-700" : "bg-slate-100"}`}>
                {[["login", "Войти"], ["register", "Зарегистрироваться"]].map(([k, v]) => (
                  <button key={k} onClick={() => { setAuthMode(k); setError("") }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === k ? dm ? "bg-gray-600 shadow-sm text-white" : "bg-white shadow-sm text-dark-900" : dm ? "text-gray-400" : "text-slate-500"}`}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="space-y-4 mb-6">
                {authMode === "register" && (
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Ваше имя" className={inputCls} />
                  </div>
                )}
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="Email" className={inputCls} />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setF("password", e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleEmailAuth()} placeholder="Пароль"
                    className={`${inputCls} pr-12`} />
                  <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {authMode === "register" && (
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPass ? "text" : "password"} value={form.confirmPassword} onChange={e => setF("confirmPassword", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleEmailAuth()} placeholder="Повторите пароль" className={inputCls} />
                  </div>
                )}
              </div>
              {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
              <button onClick={handleEmailAuth} disabled={loading}
                className="w-full py-3 rounded-2xl bg-dark-900 text-white font-semibold hover:bg-brand-600 transition-colors mb-4 disabled:opacity-50">
                {loading ? "Загрузка..." : authMode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
              {role === "user" && authMode === "login" && (
                <button onClick={() => setStep("forgot-password")} className={`w-full text-xs transition-colors mb-4 text-center ${dm ? "text-gray-400 hover:text-brand-400" : "text-slate-400 hover:text-brand-600"}`}>
                  Забыли пароль? Отправить запрос администратору
                </button>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex-1 h-px ${dm ? "bg-gray-700" : "bg-slate-200"}`} />
                <span className={`text-xs ${textSub}`}>или</span>
                <div className={`flex-1 h-px ${dm ? "bg-gray-700" : "bg-slate-200"}`} />
              </div>
              <div className="flex justify-center">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Ошибка Google входа")}
                  theme="outline" size="large" shape="rectangular" locale="ru" />
              </div>
            </motion.div>
          )}

          {/* Установка пароля для нового Google-пользователя */}
          {step === "set-google-password" && (
            <motion.div key="set-google-password" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto mb-4">
                <KeyRound size={24} />
              </div>
              <h2 className={`font-display font-bold text-xl mb-2 text-center ${textMain}`}>Добавить пароль?</h2>
              <p className={`text-sm text-center mb-2 ${textSub}`}>
                Вы вошли через Google. Можно дополнительно установить пароль, чтобы входить и по email.
              </p>
              <div className={`rounded-2xl px-4 py-3 mb-6 text-xs text-center ${dm ? "bg-gray-700 text-gray-300" : "bg-brand-50 text-brand-700"}`}>
                👤 {googleUserData?.name} · {googleUserData?.email}
              </div>
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? "text" : "password"} value={googlePassword}
                    onChange={e => { setGooglePassword(e.target.value); setError("") }}
                    placeholder="Придумайте пароль (мин. 6 символов)"
                    className={`${inputCls} pr-12`} />
                  <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? "text" : "password"} value={googlePasswordConfirm}
                    onChange={e => { setGooglePasswordConfirm(e.target.value); setError("") }}
                    onKeyDown={e => e.key === "Enter" && saveGooglePassword()}
                    placeholder="Повторите пароль"
                    className={inputCls} />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
              <button onClick={saveGooglePassword} disabled={loading}
                className="w-full py-3 rounded-2xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 mb-3">
                {loading ? "Сохранение..." : "Установить пароль и войти"}
              </button>
              <button onClick={skipGooglePassword}
                className={`w-full py-3 rounded-2xl border text-sm font-medium transition-colors ${dm ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                Пропустить — войти без пароля
              </button>
            </motion.div>
          )}

          {step === "operator-code" && (
            <motion.div key="code" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dm ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-600"}`}>
                <Shield size={24} />
              </div>
              <h2 className={`font-display font-bold text-xl mb-2 text-center ${textMain}`}>Код доступа</h2>
              <p className={`text-sm text-center mb-6 ${textSub}`}>Введите код для входа в панель специалиста</p>
              <div className="relative mb-4">
                <input type={showPass ? "text" : "password"} value={operatorCode}
                  onChange={e => { setOperatorCode(e.target.value); setError("") }}
                  onKeyDown={e => e.key === "Enter" && verifyOperatorCode()} placeholder="Введите код..."
                  className={`w-full border-2 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 pr-12 ${error ? "border-red-300" : dm ? "border-gray-600 bg-gray-700 text-white" : "border-slate-200"}`} />
                <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
              <button onClick={verifyOperatorCode} className="w-full py-3 rounded-2xl bg-dark-900 text-white font-semibold hover:bg-brand-600 transition-colors mb-3">Войти в панель</button>
              <button onClick={() => { setStep("auth"); setOperatorCode(""); setError("") }}
                className={`w-full py-3 rounded-2xl border text-sm transition-colors ${dm ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                Назад
              </button>
            </motion.div>
          )}

          {step === "set-code" && (
            <motion.div key="set-code" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto mb-4">
                <Shield size={24} />
              </div>
              <h2 className={`font-display font-bold text-xl mb-2 text-center ${textMain}`}>Придумайте свой код</h2>
              <p className={`text-sm text-center mb-6 ${textSub}`}>Это ваш личный код для входа. Запомните его!</p>
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? "text" : "password"} value={newCode} onChange={e => { setNewCode(e.target.value); setError("") }}
                    placeholder="Новый код (минимум 4 символа)"
                    className={`${inputCls} pr-12`} />
                  <button onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPass ? "text" : "password"} value={confirmNewCode} onChange={e => { setConfirmNewCode(e.target.value); setError("") }}
                    onKeyDown={e => e.key === "Enter" && saveNewCode()} placeholder="Повторите код" className={inputCls} />
                </div>
              </div>
              {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
              <button onClick={saveNewCode} disabled={loading}
                className="w-full py-3 rounded-2xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50">
                {loading ? "Сохранение..." : "Сохранить и войти"}
              </button>
            </motion.div>
          )}

          {step === "forgot-password" && (
            <motion.div key="forgot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={cardCls}>
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mx-auto mb-4">
                <Lock size={24} />
              </div>
              <h2 className={`font-display font-bold text-xl mb-2 text-center ${textMain}`}>Забыли пароль?</h2>
              <p className={`text-sm text-center mb-6 ${textSub}`}>Введите email — администратор получит запрос и сбросит пароль</p>
              {!forgotSent ? (
                <>
                  <div className="relative mb-4">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setError("") }}
                      placeholder="Ваш email" className={inputCls} />
                  </div>
                  {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}
                  <button onClick={async () => {
                    if (!forgotEmail) { setError("Введите email"); return }
                    setLoading(true)
                    try {
                      const res = await fetch(`${API}/auth/request-password-reset`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: forgotEmail }),
                      })
                      const data = await res.json()
                      if (!res.ok) { setError(data.error); return }
                      setForgotSent(true)
                    } catch { setError("Ошибка соединения") }
                    finally { setLoading(false) }
                  }} disabled={loading}
                    className="w-full py-3 rounded-2xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 mb-3">
                    {loading ? "Отправка..." : "Отправить запрос"}
                  </button>
                </>
              ) : (
                <div className="bg-emerald-50 rounded-2xl p-4 mb-4 text-center border border-emerald-200">
                  <p className="text-emerald-700 text-sm font-medium">✅ Запрос отправлен!</p>
                  <p className="text-emerald-600 text-xs mt-1">Администратор скоро сбросит ваш пароль</p>
                </div>
              )}
              <button onClick={() => { setStep("auth"); setForgotEmail(""); setForgotSent(false); setError("") }}
                className={`w-full py-3 rounded-2xl border text-sm transition-colors ${dm ? "border-gray-700 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                Назад
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
