import { useState, useEffect } from "react"
import Login from "./pages/Login"
import Welcome from "./pages/Welcome"
import Study from "./pages/Study"
import Practice from "./pages/Practice"
import WrongBook from "./pages/WrongBook"
import Profile from "./pages/Profile"
import About from "./pages/About"
import { hasToken, clearToken, getMe, type Preferences } from "./api"

type Page = "login" | "welcome" | "study" | "practice" | "wrongbook" | "profile" | "about"

function App() {
  const [page, setPage] = useState<Page>("login")
  const [sessionId, setSessionId] = useState(localStorage.getItem("sessionId") || "")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [preferences, setPreferences] = useState<Preferences>({
    id: null,
    show_english: true,
    show_practice: true,
    show_wrong_book: true,
  })

  // 检查是否已登录
  useEffect(() => {
    if (hasToken()) {
      getMe()
        .then(() => setPage("welcome"))
        .catch(() => { clearToken(); setPage("login") })
        .finally(() => setCheckingAuth(false))
    } else {
      setCheckingAuth(false)
    }
  }, [])

  // 持久化 sessionId
  useEffect(() => {
    if (sessionId) localStorage.setItem("sessionId", sessionId)
  }, [sessionId])

  const handleLogin = () => {
    setPage("welcome")
  }

  const handleStart = (prefs: Preferences) => {
    setPreferences(prefs)
    setPage("study")
  }

  const handleNavigate = (target: string, sid?: string) => {
    if (sid) {
      setSessionId(sid)
      localStorage.setItem("sessionId", sid)
    }
    setPage(target as Page)
  }

  const handleLogout = () => {
    clearToken()
    localStorage.removeItem("sessionId")
    setSessionId("")
    setPage("login")
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (page === "login") {
    return <Login onLogin={handleLogin} />
  }

  // 已登录页面的通用导航栏
  const NavBar = () => (
    <div className="border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 bg-white">
      <span className="text-sm font-medium text-gray-800">📚 爱学</span>
      <button onClick={() => setPage("about")} className="text-xs text-gray-400 hover:text-gray-600">关于我</button>
      <div className="flex-1" />
      <button onClick={() => handleNavigate("wrongbook")} className="text-xs text-gray-400 hover:text-gray-600">错题本</button>
      <button onClick={() => setPage("profile")} className="text-xs text-gray-400 hover:text-gray-600">我的</button>
    </div>
  )

  switch (page) {
    case "welcome":
      return (
        <>
          <NavBar />
          <Welcome onStart={handleStart} />
        </>
      )
    case "study":
      return <Study preferences={preferences} onNavigate={handleNavigate} />
    case "practice":
      return <Practice sessionId={sessionId} preferences={preferences} onNavigate={handleNavigate} />
    case "wrongbook":
      return <WrongBook onNavigate={handleNavigate} />
    case "profile":
      return <Profile onNavigate={handleNavigate} onLogout={handleLogout} />
    case "about":
      return <About onNavigate={handleNavigate} />
    default:
      return null
  }
}

export default App
