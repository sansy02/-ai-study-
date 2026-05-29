import { useState, useEffect } from "react"
import {
  generateExercises,
  submitAnswers,
  type Preferences,
  type ExerciseItem,
  type SubmitResult,
} from "../api"

interface PracticeProps {
  sessionId: string
  preferences: Preferences
  onNavigate: (page: string) => void
}

export default function Practice({ sessionId, preferences, onNavigate }: PracticeProps) {
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState("")
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({})

  // 加载或生成练习题
  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    generateExercises(sessionId)
      .then((data) => setExercises(data.exercises))
      .catch((err) => setError("练习生成失败: " + (err.message || "未知错误")))
      .finally(() => setLoading(false))
  }, [sessionId])

  // 更新答案
  const setAnswer = (exId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [exId]: value }))
  }

  // 提交批改
  const handleSubmit = async () => {
    const answerList = exercises.map((ex) => ({
      exercise_id: ex.id,
      answer: answers[ex.id] || "",
    }))
    try {
      const res = await submitAnswers(sessionId, answerList)
      setResult(res)
      setSubmitted(true)
    } catch (err: any) {
      setError("提交失败: " + (err.message || "未知错误"))
    }
  }

  // 渲染题目
  const renderQuestion = (ex: ExerciseItem, index: number) => {
    const userAnswer = answers[ex.id] || ""
    const isCorrect = result?.results.find((r) => r.exercise_id === ex.id)?.is_correct
    const correctAnswer = result?.results.find((r) => r.exercise_id === ex.id)?.correct_answer
    const explanation = result?.results.find((r) => r.exercise_id === ex.id)?.explanation

    return (
      <div key={ex.id} className={`p-5 rounded-xl ${submitted ? (isCorrect ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100") : "bg-gray-50 border border-gray-100"}`}>
        <div className="flex items-start gap-2 mb-3">
          <span className="text-xs font-medium text-gray-400 shrink-0 mt-0.5">
            {index + 1}.
          </span>
          <div className="flex-1">
            <p className="text-sm text-gray-800 mb-0.5">{ex.question}</p>
            <span className="text-xs text-gray-400">
              {ex.type === "choice" ? "选择题" : ex.type === "blank" ? "填空题" : "简答题"}
            </span>
          </div>
        </div>

        {/* 选项/输入框 */}
        {ex.type === "choice" && ex.options.length > 0 && (
          <div className="ml-5 space-y-2">
            {ex.options.map((opt) => {
              const label = opt.substring(0, 2).replace(".", "").trim()
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                    ${submitted
                      ? label === correctAnswer
                        ? "bg-green-100"
                        : label === userAnswer && !isCorrect
                          ? "bg-red-100"
                          : "bg-white"
                      : userAnswer === label
                        ? "bg-gray-100"
                        : "bg-white hover:bg-gray-50"
                    }`}
                >
                  <input
                    type="radio"
                    name={`q-${ex.id}`}
                    value={label}
                    checked={userAnswer === label}
                    onChange={() => setAnswer(ex.id, label)}
                    disabled={submitted}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              )
            })}
          </div>
        )}

        {(ex.type === "blank" || ex.type === "short_answer") && (
          <div className="ml-5">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setAnswer(ex.id, e.target.value)}
              disabled={submitted}
              placeholder={ex.type === "blank" ? "填入答案" : "输入你的回答"}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none
                         focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        )}

        {/* 批改结果 */}
        {submitted && (
          <div className="ml-5 mt-3">
            {isCorrect ? (
              <p className="text-xs text-green-600">✅ 正确</p>
            ) : (
              <div>
                <p className="text-xs text-red-500">❌ 错误 · 正确答案：{correctAnswer}</p>
                {explanation && (
                  <button
                    onClick={() => setShowAnswers((p) => ({ ...p, [ex.id]: !p[ex.id] }))}
                    className="text-xs text-blue-500 mt-1"
                  >
                    {showAnswers[ex.id] ? "隐藏解析" : "查看解析"}
                  </button>
                )}
                {showAnswers[ex.id] && explanation && (
                  <p className="text-xs text-gray-600 mt-1 bg-white p-2 rounded">{explanation}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">正在生成练习题...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部栏 */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => onNavigate("study", sessionId)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ← 返回学习
        </button>
        <h2 className="text-sm font-medium text-gray-800 flex-1">练习题</h2>
        {submitted && result && (
          <span className="text-xs text-gray-500">
            得分：<span className="font-medium text-gray-800">{result.score}分</span>
            （{result.correct}/{result.total}）
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        {/* 题目列表 */}
        <div className="space-y-4 mb-8">
          {exercises.map((ex, i) => renderQuestion(ex, i))}
        </div>

        {/* 提交按钮 */}
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl
                       hover:bg-gray-800 transition-colors"
          >
            提交批改
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-lg font-semibold text-gray-800">{result?.score} 分</p>
              <p className="text-xs text-gray-400 mt-1">
                正确 {result?.correct} 题 · 错误 {result?.wrong} 题
              </p>
            </div>
            <div className="flex gap-3">
              {preferences.show_wrong_book && (
                <button
                  onClick={() => onNavigate("wrongbook")}
                  className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl
                             hover:bg-gray-50 transition-colors"
                >
                  查看错题本
                </button>
              )}
              <button
                onClick={() => onNavigate("study", sessionId)}
                className="flex-1 py-2.5 text-sm text-white bg-gray-900 rounded-xl
                           hover:bg-gray-800 transition-colors"
              >
                返回学习
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
