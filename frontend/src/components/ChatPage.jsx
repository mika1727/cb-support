import { useState, useEffect, useRef, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Send, Mic, PhoneCall,
  ChevronLeft, Command, ShieldAlert, Cpu, Keyboard,
  RefreshCcw, Settings, Bell, X, FileText,
  Image as ImageIcon, Link as LinkIcon, Trash2
} from "lucide-react"
import { useApp } from "../App"

const QUICK_PROMPTS = [
  { icon: ShieldAlert, text: "Что такое Web3?",  msg: "Что такое Web3 и децентрализация?" },
  { icon: Command,     text: "Проблема с Excel", msg: "Не запускается Excel, ошибка 0x800706BA" },
  { icon: Cpu,         text: "VPN Не работает",  msg: "Не подключается корпоративный VPN" },
  { icon: Keyboard,    text: "Сбросить пароль",  msg: "Мне нужно сбросить пароль" },
]

const API_BASE = "http://localhost:3001/api"
const SESSIONS_KEY = "cb_sessions"

function getSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]") } catch { return [] }
}
function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

export default function ChatPage() {
  const { darkMode } = useApp()
  const navigate = useNavigate()
  const [messages, setMessages]             = useState([])
  const [input, setInput]                   = useState("")
  const [isTyping, setIsTyping]             = useState(false)
  const [showEscalate, setShowEscalate]     = useState(false)
  const [sessionId]                         = useState(() => `s_${Date.now()}`)
  const [history, setHistory]               = useState([])
  const [attachments, setAttachments]       = useState([])
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [linkInput, setLinkInput]           = useState("")
  const [showLinkInput, setShowLinkInput]   = useState(false)
  const [chatSessions, setChatSessions]     = useState(getSessions)
  const [isRecording, setIsRecording]       = useState(false)
  const [feedback, setFeedback]             = useState({})
  const [editModal, setEditModal]           = useState(null)
  const [lightbox, setLightbox]             = useState(null)
  const [speaking, setSpeaking]             = useState(null)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef    = useRef(null)
  const fileInputRef   = useRef(null)
  const photoInputRef  = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  useEffect(() => { scrollToBottom() }, [messages, isTyping])

  const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })

  const saveSession = useCallback((firstMsg) => {
    const saved = getSessions()
    if (saved.find(s => s.id === sessionId)) return
    const updated = [{ id: sessionId, title: firstMsg.slice(0, 45), time: now(), date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) }, ...saved].slice(0, 30)
    saveSessions(updated)
    setChatSessions(updated)
  }, [sessionId])

  const deleteSession = (id, e) => {
    e.stopPropagation()
    const updated = getSessions().filter(s => s.id !== id)
    saveSessions(updated)
    setChatSessions(updated)
  }

  const clearAllSessions = () => { saveSessions([]); setChatSessions([]) }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert("Ваш браузер не поддерживает распознавание речи. Используйте Chrome."); return }
    if (isRecording) { recognitionRef.current?.stop(); setIsRecording(false); return }
    const rec = new SR()
    rec.lang = "ru-RU"; rec.continuous = false; rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      setInput(prev => prev ? prev + " " + text : text)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
      }
    }
    rec.onend = () => setIsRecording(false)
    rec.onerror = () => setIsRecording(false)
    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }

  const speakText = (text, msgId) => {
    if (speaking === msgId) { window.speechSynthesis.cancel(); setSpeaking(null); return }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = "ru-RU"; utter.rate = 0.95; utter.pitch = 1.1
    const voices = window.speechSynthesis.getVoices()
    const preferred = ["Microsoft Irina", "Microsoft Pavel", "Irina", "Anna", "Milena"]
    const ruVoices = voices.filter(v => v.lang.startsWith("ru"))
    const best = preferred.reduce((found, name) => found || ruVoices.find(v => v.name.includes(name)), null) || ruVoices[0]
    if (best) utter.voice = best
    utter.onend = () => setSpeaking(null)
    utter.onerror = () => setSpeaking(null)
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const v2 = window.speechSynthesis.getVoices()
        const ru = v2.filter(v => v.lang.startsWith("ru"))
        const b2 = preferred.reduce((f, n) => f || ru.find(v => v.name.includes(n)), null) || ru[0]
        if (b2) utter.voice = b2
        window.speechSynthesis.speak(utter)
      }
    } else { window.speechSynthesis.speak(utter) }
    setSpeaking(msgId)
  }

  const copyText = (text) => { navigator.clipboard.writeText(text).catch(() => {}) }
  const openEditModal = (msg) => { setEditModal({ text: msg.text, attachments: msg.attachments || [] }) }
  const resend = (msg) => { send(msg.text) }

  const send = useCallback(async (text, overrideAttachments) => {
    const msg = (text || input).trim()
    const currentAttachments = overrideAttachments !== undefined ? overrideAttachments : attachments
    if ((!msg && currentAttachments.length === 0) || isTyping) return
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setShowAttachMenu(false); setShowLinkInput(false)
    const userMsg = { role: "user", text: msg, time: now(), id: Date.now(), attachments: [...currentAttachments] }
    if (overrideAttachments === undefined) setAttachments([])
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)
    saveSession(msg)
    const newHistory = [...history, { role: "user", content: msg }]
    try {
      let imageBase64 = null, imageMimeType = null
      const imageAttachment = currentAttachments.find(a => a.type?.startsWith("image") && a.url?.startsWith("blob:"))
      if (imageAttachment) {
        try {
          const blob = await fetch(imageAttachment.url).then(r => r.blob())
          imageBase64 = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result.split(",")[1])
            reader.readAsDataURL(blob)
          })
          imageMimeType = imageAttachment.type
        } catch {}
      }
      const res = await fetch(`${API_BASE}/dialog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: msg, history: newHistory, imageBase64, imageMimeType }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const reply = data.reply || "Нет ответа."
      const options = data.options || []
      setMessages(prev => [...prev, { role: "bot", text: reply, time: now(), id: Date.now() + 1, options }])
      setHistory([...newHistory, { role: "assistant", content: reply }])
      if (data.suggestEscalate) setShowEscalate(true)
    } catch (e) {
      setMessages(prev => [...prev, { role: "bot", text: `⚠️ Не удалось подключиться к серверу (${e.message}).`, time: now(), id: Date.now() + 1 }])
    } finally { setIsTyping(false) }
  }, [input, isTyping, history, sessionId, attachments, messages.length, saveSession])

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter(item => item.type.startsWith("image"))
    if (imageItems.length > 0) {
      e.preventDefault()
      imageItems.forEach(item => {
        const file = item.getAsFile()
        if (file) {
          const url = URL.createObjectURL(file)
          setAttachments(prev => [...prev, { name: `скриншот_${Date.now()}.png`, url, type: file.type }])
        }
      })
    }
  }

  const handleTextarea = (e) => {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files.map(f => ({ name: f.name, url: URL.createObjectURL(f), type: f.type }))])
    e.target.value = ""
    setShowAttachMenu(false)
  }

  const addLink = () => {
    const url = linkInput.trim()
    if (!url) return
    setAttachments(prev => [...prev, { name: url, url, type: "link" }])
    setLinkInput(""); setShowLinkInput(false); setShowAttachMenu(false)
  }

  const dm = darkMode
  const sidebarBg = dm ? "bg-gray-800/60 border-gray-700" : "bg-white/40 border-white/60"
  const chatBg    = dm ? "bg-gray-800/80 border-gray-700/60" : "bg-white/70 border-white/60"
  const msgUser   = dm ? "bg-gray-700 text-white border-gray-600" : "bg-white text-dark-900 border-slate-100"
  const msgBot    = dm ? "bg-gray-700 text-white border-gray-600" : "bg-white text-slate-800 border-slate-100"
  const inputBg   = dm ? "bg-gray-700/90 border-gray-600" : "bg-white/90 border-white"
  const textMain  = dm ? "text-white" : "text-dark-900"
  const textSub   = dm ? "text-gray-400" : "text-slate-400"

  return (
    <div className={`flex h-screen w-full font-sans overflow-hidden relative transition-colors duration-300 ${dm ? "bg-gray-950" : "bg-[#fdfcff]"}`}>
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#fbcfe8]/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#ddd6fe]/50 blur-[130px]" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#cffafe]/30 blur-[100px]" />
      </div>

      {/* SIDEBAR */}
      <aside className={`w-80 backdrop-blur-3xl border-r flex-col hidden lg:flex z-20 ${sidebarBg}`}>
        <div className={`pt-8 pb-4 px-8 border-b ${dm ? "border-gray-700" : "border-white/50"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm">
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Hi, Alex</p>
              <p className={`text-base font-bold ${textMain}`}>Welcome Back</p>
            </div>
            <div className={`ml-auto w-10 h-10 rounded-full flex items-center justify-center shadow-sm border ${dm ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-white text-slate-700 border-slate-100"}`}>
              <div className="relative">
                <Bell size={18} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full border border-white" />
              </div>
            </div>
          </div>
          <h2 className={`font-display font-bold text-3xl leading-tight mb-6 mt-4 ${textMain}`}>
            Good Morning <br /> How can I help you?
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setMessages([]); setHistory([]); setShowEscalate(false) }}
              className={`backdrop-blur-md rounded-3xl p-5 border shadow-sm hover:shadow-md transition-shadow cursor-pointer group text-left ${dm ? "bg-gray-700/80 border-gray-600" : "bg-white/80 border-white"}`}>
              <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={20} />
              </div>
              <p className={`font-bold text-sm mb-1 leading-tight ${textMain}`}>Talk to AI<br />assistant</p>
              <p className="text-xs text-slate-500 mt-2">Let's try it now</p>
            </button>
            <div className="space-y-4">
              <button onClick={startVoice}
                className={`w-full backdrop-blur-md rounded-2xl p-4 border shadow-sm flex items-center gap-3 cursor-pointer transition-colors ${isRecording ? "bg-red-50 border-red-200" : dm ? "bg-gray-700/80 border-gray-600 hover:bg-gray-700" : "bg-white/80 border-white hover:bg-white"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isRecording ? "bg-red-100 text-red-500" : dm ? "bg-gray-600 text-gray-300" : "bg-slate-100 text-slate-600"}`}>
                  <Mic size={14} className={isRecording ? "animate-pulse" : ""} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-xs font-bold ${textMain}`}>{isRecording ? "Слушаю..." : "Voice"}</p>
                  <p className={`text-[10px] ${textSub}`}>{isRecording ? "Нажми чтобы остановить" : "to text"}</p>
                </div>
              </button>
              <button onClick={() => navigate("/settings")}
                className={`w-full backdrop-blur-md rounded-2xl p-4 border shadow-sm flex items-center gap-3 cursor-pointer transition-colors ${dm ? "bg-gray-700/80 border-gray-600 hover:bg-gray-700" : "bg-white/80 border-white hover:bg-white"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dm ? "bg-gray-600 text-gray-300" : "bg-slate-100 text-slate-600"}`}><Settings size={14} /></div>
                <div className="flex-1 text-left">
                  <p className={`text-xs font-bold ${textMain}`}>Settings</p>
                  <p className={`text-[10px] ${textSub}`}>App config</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className={`text-sm font-bold ${textMain}`}>Recent Chats</h3>
              {chatSessions.length > 0 && (
                <button onClick={clearAllSessions} className="text-xs text-red-400 font-medium hover:text-red-600 flex items-center gap-1">
                  <Trash2 size={11} /> Очистить
                </button>
              )}
            </div>
            <div className="space-y-2">
              {chatSessions.length === 0 ? (
                <p className={`text-xs px-4 ${textSub}`}>История пуста</p>
              ) : (
                chatSessions.map((s) => (
                  <div key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-colors group ${s.id === sessionId ? dm ? "bg-gray-700 border border-gray-600 shadow-sm" : "bg-white shadow-sm border border-white" : dm ? "hover:bg-gray-700/50 border border-transparent" : "hover:bg-white/50 border border-transparent"}`}>
                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-sm shadow-sm flex-shrink-0">💬</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${textMain}`}>{s.title}</p>
                      <p className={`text-xs mt-0.5 ${textSub}`}>{s.id === sessionId ? "Сейчас" : s.date}</p>
                    </div>
                    <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-6 pb-8 flex justify-center">
          <Link to="/" className={`p-2 ${dm ? "text-gray-400 hover:text-white" : "text-slate-400 hover:text-dark-900"}`}><ChevronLeft size={24} /></Link>
        </div>
      </aside>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setEditModal(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-[2rem] p-6 w-full max-w-lg mx-4 shadow-2xl ${dm ? "bg-gray-800" : "bg-white"}`}>
              <h3 className={`font-bold mb-4 ${dm ? "text-white" : "text-dark-900"}`}>Редактировать сообщение</h3>
              {editModal.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {editModal.attachments.map((a, i) => (
                    <div key={i} className="relative group">
                      {a.type?.startsWith("image") ? (
                        <div className="relative">
                          <img src={a.url} alt="" className="h-20 w-20 object-cover rounded-xl border border-slate-200" />
                          <button onClick={() => setEditModal(prev => ({ ...prev, attachments: prev.attachments.filter((_, j) => j !== i) }))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm text-xs">×</button>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs ${dm ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                          <FileText size={12} />
                          <span className="max-w-[120px] truncate">{a.name}</span>
                          <button onClick={() => setEditModal(prev => ({ ...prev, attachments: prev.attachments.filter((_, j) => j !== i) }))} className="ml-1 text-slate-400 hover:text-red-400">×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <textarea autoFocus value={editModal.text} onChange={e => setEditModal(prev => ({ ...prev, text: e.target.value }))} rows={4}
                className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none mb-4 ${dm ? "bg-gray-700 border-gray-600 text-white" : "border-slate-200 text-dark-900"}`} />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditModal(null)} className={`px-5 py-2.5 rounded-2xl border text-sm font-medium transition-colors ${dm ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Отмена</button>
                <button onClick={() => { send(editModal.text, editModal.attachments); setEditModal(null) }}
                  className="px-5 py-2.5 rounded-2xl bg-dark-900 text-white text-sm font-medium hover:bg-brand-600 transition-colors">Отправить</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center cursor-zoom-out"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="relative max-w-[90vw] max-h-[90vh]">
              <img src={lightbox} alt="preview" className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl object-contain" />
              <button onClick={() => setLightbox(null)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-dark-900 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 px-4 md:px-10 py-6 md:py-8">
        <div className={`w-full max-w-4xl mx-auto flex flex-col h-full backdrop-blur-2xl rounded-[3rem] shadow-2xl shadow-brand-900/10 border overflow-hidden relative ${chatBg}`}>
          <header className="h-20 flex items-center justify-between px-8 bg-transparent">
            <Link to="/" className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-colors ${dm ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-white text-dark-900 hover:bg-slate-50"}`}>
              <ChevronLeft size={20} />
            </Link>
            <h1 className={`font-display font-bold text-lg ${dm ? "text-white" : "text-dark-900"}`}>Smart Chat</h1>
            <button onClick={() => { setMessages([]); setHistory([]); setShowEscalate(false); setAttachments([]) }}
              className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-colors ${dm ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-white text-dark-900 hover:bg-slate-50"}`}>
              <RefreshCcw size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth scrollbar-hide">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 items-end mt-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white mb-2 shadow-lg shadow-brand-500/30">
                    <Sparkles size={18} />
                  </div>
                  <div className={`px-6 py-4 rounded-[2rem] rounded-bl-xl shadow-sm text-sm font-medium ${dm ? "bg-gray-700 text-white" : "bg-white text-dark-900"}`}>
                    Привет! Чем могу помочь? 😊
                  </div>
                </motion.div>
              )}

              {messages.map(m => (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} key={m.id}
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"} w-full items-end group`}>
                  {m.role === "bot" && (
                    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold mb-1 shadow-lg shadow-brand-500/30">
                      <Sparkles size={18} />
                    </div>
                  )}
                  <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} max-w-[80%] gap-2`}>
                    {m.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.attachments.map((a, i) => (
                          a.type?.startsWith("image") ? (
                            <img key={i} src={a.url} alt={a.name} onClick={() => setLightbox(a.url)}
                              className="max-h-48 max-w-xs rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:opacity-90 transition-opacity object-cover" />
                          ) : (
                            <div key={i} className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs shadow-sm ${dm ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-white border-slate-100 text-slate-600"}`}>
                              {a.type === "link" ? <LinkIcon size={12} /> : <FileText size={12} />}
                              <span className="max-w-[160px] truncate">{a.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <div className={`px-6 py-4 text-sm leading-relaxed whitespace-pre-wrap font-medium border shadow-sm ${m.role === "user" ? `${msgUser} rounded-[2rem] rounded-tr-xl` : `${msgBot} rounded-[2rem] rounded-bl-xl`}`}>
                      {m.text}
                    </div>
                    {m.role === "bot" && m.options?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {m.options.map((opt, i) => (
                          <button key={i} onClick={() => send(opt)}
                            className="bg-brand-50 hover:bg-brand-100 border border-brand-100 text-brand-700 text-xs font-medium px-4 py-2 rounded-2xl transition-colors active:scale-95">
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.role === "bot" && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => speakText(m.text, m.id)} className={`p-1.5 rounded-lg text-xs transition-colors ${speaking === m.id ? "bg-brand-100 text-brand-600" : "text-slate-400 hover:text-brand-500 hover:bg-brand-50"}`}>{speaking === m.id ? "⏹" : "🔊"}</button>
                        <button onClick={() => copyText(m.text)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors text-xs">📋</button>
                        <button onClick={() => setFeedback(prev => ({...prev, [m.id]: prev[m.id] === "like" ? null : "like"}))} className={`p-1.5 rounded-lg text-xs transition-colors ${feedback[m.id] === "like" ? "text-emerald-500 bg-emerald-50" : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"}`}>👍</button>
                        <button onClick={() => setFeedback(prev => ({...prev, [m.id]: prev[m.id] === "dislike" ? null : "dislike"}))} className={`p-1.5 rounded-lg text-xs transition-colors ${feedback[m.id] === "dislike" ? "text-red-500 bg-red-50" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}>👎</button>
                      </div>
                    )}
                    {m.role === "user" && (
                      <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyText(m.text)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors text-xs">📋</button>
                        <button onClick={() => openEditModal(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors text-xs">✏️</button>
                        <button onClick={() => resend(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors text-xs">🔄</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              <AnimatePresence>
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex gap-3 items-end">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white mb-1 shadow-md">
                      <Sparkles size={18} />
                    </div>
                    <div className={`border rounded-[2rem] rounded-bl-xl px-5 py-5 flex gap-1.5 items-center shadow-sm ${dm ? "bg-gray-700 border-gray-600" : "bg-white border-slate-100"}`}>
                      <motion.div animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }}   className="w-2 h-2 bg-brand-400 rounded-full" />
                      <motion.div animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand-400 rounded-full" />
                      <motion.div animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand-400 rounded-full" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showEscalate && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-center">
                    <Link to="/operator" className="flex items-center gap-2 bg-white border border-brand-200 text-brand-600 px-6 py-3 rounded-2xl text-sm font-medium shadow-sm hover:bg-brand-50 transition-all">
                      <PhoneCall size={16} /> Связаться со специалистом
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-2" />
            </div>
          </div>

          <div className="p-6 md:p-8 bg-transparent z-10 w-full mt-auto relative pt-0">
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto mb-6 flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {QUICK_PROMPTS.map((q, i) => (
                  <button key={i} onClick={() => send(q.msg)}
                    className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-medium border shadow-sm hover:shadow-md transition-shadow whitespace-nowrap ${dm ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-slate-100 text-dark-900"}`}>
                    {q.text}
                  </button>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="max-w-2xl mx-auto mb-3 flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="relative group">
                    {a.type?.startsWith("image") ? (
                      <div className="relative">
                        <img src={a.url} alt={a.name} className="h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
                        <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm"><X size={10} /></button>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs shadow-sm ${dm ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-white border-slate-200 text-slate-600"}`}>
                        {a.type === "link" ? <LinkIcon size={12} /> : <FileText size={12} />}
                        <span className="max-w-[140px] truncate">{a.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-slate-400 hover:text-red-400"><X size={12} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence>
              {showLinkInput && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto mb-3 flex gap-2">
                  <input autoFocus value={linkInput} onChange={e => setLinkInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()}
                    placeholder="Вставьте ссылку..."
                    className={`flex-1 border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 shadow-sm ${dm ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" : "bg-white border-slate-200 text-dark-900"}`} />
                  <button onClick={addLink} className="bg-brand-500 text-white px-4 py-2 rounded-2xl text-sm font-medium hover:bg-brand-400 transition-colors">Добавить</button>
                  <button onClick={() => setShowLinkInput(false)} className="text-slate-400 hover:text-dark-900 px-2"><X size={18} /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-w-2xl mx-auto relative">
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className={`absolute bottom-full left-0 mb-3 rounded-2xl shadow-xl border p-2 flex flex-col gap-1 z-30 min-w-[180px] ${dm ? "bg-gray-800 border-gray-700" : "bg-white border-slate-100"}`}>
                    <button onClick={() => photoInputRef.current?.click()} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${dm ? "text-white hover:bg-gray-700" : "text-dark-900 hover:bg-brand-50"}`}>
                      <ImageIcon size={16} className="text-brand-500" /> Фото
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${dm ? "text-white hover:bg-gray-700" : "text-dark-900 hover:bg-brand-50"}`}>
                      <FileText size={16} className="text-brand-500" /> Файл
                    </button>
                    <button onClick={() => { setShowLinkInput(true); setShowAttachMenu(false) }} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${dm ? "text-white hover:bg-gray-700" : "text-dark-900 hover:bg-brand-50"}`}>
                      <LinkIcon size={16} className="text-brand-500" /> Ссылка
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.zip" multiple className="hidden" onChange={handleFileChange} />

              <div className={`flex items-center gap-3 backdrop-blur-md border rounded-[2rem] p-2 pr-3 shadow-lg shadow-brand-900/5 transition-all ${inputBg}`}>
                <button onClick={() => setShowAttachMenu(v => !v)}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors shrink-0 ${showAttachMenu ? "bg-brand-100 text-brand-600" : dm ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-slate-400 hover:text-dark-900 hover:bg-slate-50"}`}>
                  {showAttachMenu ? <X size={20} /> : <span className="text-2xl font-light leading-none">+</span>}
                </button>
                <textarea ref={textareaRef} value={input} onChange={handleTextarea} onKeyDown={handleKeyDown} onPaste={handlePaste} rows={1}
                  placeholder="Написать сообщение..."
                  className={`flex-1 max-h-[120px] bg-transparent border-0 focus:ring-0 resize-none py-3 px-2 text-sm placeholder:text-slate-400 font-medium leading-relaxed scrollbar-hide ${dm ? "text-white" : "text-dark-900"}`} />
                <button disabled={(!input.trim() && attachments.length === 0) || isTyping} onClick={() => send()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50 transition-all shrink-0 active:scale-95 ${dm ? "bg-gray-700 text-gray-300 disabled:bg-gray-800" : "bg-brand-50 text-brand-600 disabled:bg-slate-50 disabled:text-slate-400"}`}>
                  <Mic size={20} />
                </button>
                {(input.trim() || attachments.length > 0) && !isTyping && (
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => send()}
                    className="absolute right-3 w-12 h-12 rounded-full bg-dark-900 text-white flex items-center justify-center shadow-md active:scale-95">
                    <Send size={18} className="translate-x-0.5" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}