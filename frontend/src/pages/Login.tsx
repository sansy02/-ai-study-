import { useState, useEffect } from "react"

interface LoginProps {
  onLogin: (token: string, user: { email: string; grade: string; major: string; subject: string }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [grade, setGrade] = useState("")
  const [major, setMajor] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [warming, setWarming] = useState(true)

  // 页面打开时预热后端（唤醒 Render 休眠）
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/health`)
      .then(() => setWarming(false))
      .catch(() => setWarming(false))
  }, [])

  const handleSubmit = async () => {
    setError("")
    if (!email || !password) { setError("请填写邮箱和密码"); return }
    if (mode === "register" && password !== confirmPassword) { setError("两次输入的密码不一致"); return }
    if (mode === "register" && password.length < 6) { setError("密码至少需要6位"); return }

    setLoading(true)
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body = mode === "login"
        ? JSON.stringify({ email, password })
        : JSON.stringify({ email, password, confirm_password: confirmPassword, grade, major })

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "请求失败")

      localStorage.setItem("token", data.token)
      onLogin(data.token, data.user)
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  const GRADES = ["大一", "大二", "大三", "大四", "研一", "研二", "研三", "其他"]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">AI 智能教学助手</h1>
          <p className="text-sm text-gray-400">
            {warming ? "⏳ 服务器唤醒中..." : mode === "login" ? "欢迎回来" : "创建账号开始学习"}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="your@email.com"
                   className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   placeholder="至少6位密码"
                   className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">确认密码</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                       placeholder="再次输入密码"
                       className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">年级（可选）</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none bg-white">
                  <option value="">选择年级</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">专业（可选）</label>
                <input type="text" value={major} onChange={(e) => setMajor(e.target.value)}
                       placeholder="你的专业"
                       className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400" />
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl
                           hover:bg-gray-800 disabled:opacity-50 transition-colors">
          {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
                  className="text-gray-800 underline ml-1">
            {mode === "login" ? "注册" : "登录"}
          </button>
        </p>
      </div>
    </div>
  )
}
