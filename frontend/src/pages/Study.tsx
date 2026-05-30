import { useState, useRef, useEffect } from "react"
import {
  generateContent,
  generateVocabulary,
  getLatestProfile,
  toggleVocabFavorite,
  checkApiKeyStatus,
  setApiKey,
  type Preferences,
  type OutlineItem,
  type Chapter,
  type VocabWord,
} from "../api"

interface StudyProps {
  preferences: Preferences
  onNavigate: (page: string, sessionId?: string) => void
}

export default function Study({ preferences, onNavigate }: StudyProps) {
  // 输入状态
  const [topic, setTopic] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState("")
  const [textPreview, setTextPreview] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // API Key 状态
  const [showApiPanel, setShowApiPanel] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [keyConfigured, setKeyConfigured] = useState(false)
  const [savingKey, setSavingKey] = useState(false)

  // 生成状态
  const [generating, setGenerating] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeChapter, setActiveChapter] = useState(0)
  const [contentTitle, setContentTitle] = useState("")

  // 词汇状态
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([])
  const [generatingVocab, setGeneratingVocab] = useState(false)

  // 加载学生画像
  const [profile, setProfile] = useState({ grade: "", major: "", subject: "" })
  useEffect(() => {
    getLatestProfile().then((p) => {
      if (p) setProfile({ grade: p.grade || "", major: p.major || "", subject: p.subject || "" })
    }).catch(() => {})
    checkApiKeyStatus().then((s) => setKeyConfigured(s.configured)).catch(() => {})
  }, [])

  // 保存自定义 API Key
  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) return
    setSavingKey(true)
    try {
      await setApiKey(apiKeyInput.trim())
      setKeyConfigured(true)
      setShowApiPanel(false)
      setError("")
    } catch {
      setError("API Key 保存失败")
    } finally { setSavingKey(false) }
  }

  // 上传并解析文件
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase()
    if (![".pptx", ".pdf"].includes(ext)) {
      setError("仅支持 PPTX、PDF 文件。旧版 .ppt 请先转换为 .pptx 格式。"); return
    }
    setFile(selectedFile); setError(""); setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      const token = localStorage.getItem("token") || ""
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "上传失败") }
      const data = await res.json()
      setExtractedText(data.text)
      setTextPreview(data.preview)
      if (!topic) setTopic(selectedFile.name.replace(/\.[^.]+$/, ""))
    } catch (err: any) {
      setError(err.message || "文件解析失败"); setFile(null)
    } finally { setUploading(false) }
  }

  const removeFile = () => {
    setFile(null); setExtractedText(""); setTextPreview("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // 生成教学内容
  const handleGenerate = async () => {
    setGenerating(true); setError(""); setVocabWords([])
    try {
      const result = await generateContent({
        topic: topic.trim() || "未命名话题",
        source_type: extractedText ? "file" : "topic",
        source_text: extractedText,
        grade: profile.grade,
        major: profile.major,
        subject: profile.subject,
      })
      setSessionId(result.session_id)
      setContentTitle(result.topic)
      setOutline(result.outline)
      setChapters(result.chapters)
      setActiveChapter(0)

      // 如果开启了英语词汇，自动生成
      if (preferences.show_english) {
        setGeneratingVocab(true)
        generateVocabulary(result.session_id)
          .then((v) => setVocabWords(v.words))
          .catch(() => {})
          .finally(() => setGeneratingVocab(false))
      }
    } catch (err: any) {
      setError(err.message || "AI 生成失败，请检查 API Key 是否正确配置")
    } finally { setGenerating(false) }
  }

  const canGenerate = (topic.trim() || extractedText) && !generating

  // 已生成内容 → 显示学习页面
  if (chapters.length > 0) {
    const chapter = chapters[activeChapter]
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* 顶部栏 */}
        <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => {
              setChapters([]); setOutline([]); setSessionId("")
              setTopic(""); setExtractedText(""); setTextPreview(""); setFile(null)
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ← 返回
          </button>
          <h2 className="text-sm font-medium text-gray-800 truncate flex-1">{contentTitle}</h2>
          {preferences.show_english && (
            <span className="text-xs text-gray-300">英语 🔛</span>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧大纲 */}
          <aside className="w-56 border-r border-gray-100 overflow-y-auto p-3 shrink-0">
            <p className="text-xs text-gray-400 mb-2 px-2">教学大纲</p>
            {outline.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveChapter(i)}
                className={`w-full text-left px-2 py-2 rounded-lg text-sm mb-1 transition-colors
                  ${i === activeChapter
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                  }`}
              >
                <span className="block text-xs">{item.title}</span>
                <span className="block text-xs text-gray-300 truncate">{item.summary}</span>
              </button>
            ))}
          </aside>

          {/* 中间内容区 */}
          <main className="flex-1 overflow-y-auto p-6 max-w-3xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{chapter.title}</h3>
            {chapter.sections.map((section, si) => (
              <div key={si} className="mb-8">
                <h4 className="text-sm font-medium text-gray-800 mb-3">{section.heading}</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-3">
                  {section.body}
                </p>
                {section.example && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs text-amber-600 font-medium mb-1">💡 案例</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{section.example}</p>
                  </div>
                )}
              </div>
            ))}

            {/* 章节导航 */}
            <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
              <button
                onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}
                disabled={activeChapter === 0}
                className="text-sm text-gray-500 hover:text-gray-800 disabled:text-gray-200 disabled:cursor-not-allowed"
              >
                ← 上一章
              </button>
              <span className="text-xs text-gray-300">
                {activeChapter + 1} / {chapters.length}
              </span>
              {activeChapter < chapters.length - 1 ? (
                <button
                  onClick={() => setActiveChapter(activeChapter + 1)}
                  className="text-sm text-gray-800 hover:text-gray-600 font-medium"
                >
                  下一章 →
                </button>
              ) : preferences.show_practice ? (
                <button
                  onClick={() => onNavigate("practice", sessionId)}
                  className="text-sm text-white bg-gray-900 px-4 py-1.5 rounded-lg hover:bg-gray-800"
                >
                  开始练习 →
                </button>
              ) : (
                <button
                  onClick={() => onNavigate("welcome")}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  完成学习
                </button>
              )}
            </div>
          </main>

          {/* 右侧词汇区 */}
          {preferences.show_english && (
            <aside className="w-48 border-l border-gray-100 p-3 shrink-0 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">📚 英语词汇</p>
              </div>
              {generatingVocab ? (
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-3 h-3 border border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  生成中...
                </div>
              ) : vocabWords.length > 0 ? (
                <div className="space-y-3">
                  {vocabWords.map((w) => (
                    <div key={w.id} className="pb-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{w.word}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{w.translation}</p>
                        </div>
                        <button
                          onClick={async () => {
                            try { await toggleVocabFavorite(w.id) } catch {}
                          }}
                          className="text-xs ml-1 shrink-0"
                          title="收藏"
                        >
                          ☆
                        </button>
                      </div>
                      {w.example && (
                        <p className="text-xs text-gray-300 mt-1 italic leading-relaxed">
                          {w.example}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-300">暂无词汇</p>
              )}
            </aside>
          )}
        </div>
      </div>
    )
  }

  // 加载中
  if (generating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">AI 正在生成教学内容...</p>
        <p className="text-xs text-gray-300">这可能需要 10-30 秒</p>
      </div>
    )
  }

  // 输入页面
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <h2 className="text-sm font-medium text-gray-800">爱学助手</h2>
        <button
          onClick={() => onNavigate("welcome")}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          设置
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">今天想学什么？</h1>
          <p className="text-sm text-gray-400">
            输入话题或上传 PPT/PDF，AI 为你生成教学内容
          </p>
        </div>

        {/* API Key 面板 */}
        {!keyConfigured ? (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-medium mb-1">
              🎓 每日免费使用 5 次
            </p>
            <p className="text-xs text-amber-500 mb-3">
              更多次数请自行添加 API Key，或等待后续更新
            </p>
            {!showApiPanel ? (
              <button
                onClick={() => setShowApiPanel(true)}
                className="text-xs text-amber-600 underline hover:text-amber-800"
              >
                添加 API Key →
              </button>
            ) : (
              <div>
                <div className="flex gap-2 mb-2">
                  <input type="password" value={apiKeyInput}
                         onChange={(e) => setApiKeyInput(e.target.value)}
                         placeholder="粘贴 DeepSeek API Key"
                         className="flex-1 px-3 py-2 text-xs border border-amber-200 rounded-lg outline-none bg-white" />
                  <button onClick={handleSaveKey} disabled={!apiKeyInput.trim() || savingKey}
                          className="px-3 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700
                                     disabled:opacity-50">{savingKey ? "保存" : "确认"}</button>
                </div>
                <p className="text-xs text-amber-400">
                  如何获取？详见{' '}
                  <a href="https://github.com/sansy02/-ai-study-" target="_blank" rel="noreferrer"
                     className="underline">GitHub 说明 →</a>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
            <span className="text-xs text-green-600">✅ API Key 已配置 · 无限制使用</span>
            <button onClick={() => setShowApiPanel(true)}
                    className="text-xs text-gray-400 hover:text-gray-600">更换</button>
          </div>
        )}
        {keyConfigured && showApiPanel && (
          <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex gap-2">
              <input type="password" value={apiKeyInput}
                     onChange={(e) => setApiKeyInput(e.target.value)}
                     placeholder="输入新的 API Key"
                     className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none bg-white" />
              <button onClick={handleSaveKey} disabled={!apiKeyInput.trim() || savingKey}
                      className="px-3 py-2 text-xs bg-gray-900 text-white rounded-lg disabled:opacity-50">
                保存
              </button>
              <button onClick={() => { setShowApiPanel(false); setApiKeyInput("") }}
                      className="text-xs text-gray-400 hover:text-gray-600">取消</button>
            </div>
          </div>
        )}

        {/* 话题输入 */}
        <div className="mb-6">
          <label className="block text-xs text-gray-400 mb-2">学习话题</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='例如："机器学习基础"、"高等数学第二章"'
            className="w-full px-4 py-3 text-sm text-gray-800 border border-gray-200 rounded-xl
                       placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        {/* 文件上传 */}
        <div className="mb-8">
          <label className="block text-xs text-gray-400 mb-2">
            或者上传文件（PPTX / PDF）
          </label>
          {!file ? (
            <label
              className={`flex flex-col items-center justify-center h-32 border-2 border-dashed
                rounded-xl cursor-pointer transition-colors bg-gray-50/50
                ${dragOver ? "border-gray-500 bg-gray-100" : "border-gray-200 hover:border-gray-300"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const dropped = e.dataTransfer.files?.[0]
                if (dropped) {
                  const fakeEvent = { target: { files: [dropped] } } as any
                  handleFileChange(fakeEvent)
                }
              }}
            >
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">
                  {uploading ? "解析中..." : dragOver ? "松开鼠标上传文件" : "点击上传或拖拽文件到此处"}
                </p>
                <p className="text-xs text-gray-300">支持 PPTX、PDF，最大 20MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".pptx,.pdf"
                     onChange={handleFileChange} className="hidden" disabled={uploading} />
            </label>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-lg">📄</span>
                <div>
                  <p className="text-sm text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {extractedText ? `已提取 ${extractedText.length} 字` : "解析中..."}
                  </p>
                </div>
              </div>
              <button onClick={removeFile} className="text-gray-400 hover:text-gray-600 text-sm">移除</button>
            </div>
          )}
        </div>

        {textPreview && (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-1">文件内容预览</p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
              {textPreview}
              {extractedText.length > 2000 && (
                <span className="text-gray-300"> ... (共 {extractedText.length} 字)</span>
              )}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-500 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`w-full py-3 text-sm font-medium rounded-xl transition-colors
            ${canGenerate
              ? "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
        >
          生成教学内容 →
        </button>
      </div>
    </div>
  )
}
