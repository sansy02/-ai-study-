import { useState, useEffect } from "react"
import { getUserVocabulary, type VocabWord } from "../api"

interface VocabularyBookProps {
  onNavigate: (page: string) => void
}

export default function VocabularyBook({ onNavigate }: VocabularyBookProps) {
  const [words, setWords] = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    getUserVocabulary()
      .then((data) => setWords(data.words))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部栏 */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <button onClick={() => onNavigate("profile")} className="text-xs text-gray-400 hover:text-gray-600">← 返回</button>
        <h2 className="text-sm font-medium text-gray-800 flex-1">我的词汇收藏</h2>
        <span className="text-xs text-gray-300">{words.length} 词</span>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        {words.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📖</p>
            <p className="text-sm text-gray-400">还没有收藏的词汇</p>
            <p className="text-xs text-gray-300 mt-1">学习时点击 ☆ 即可收藏</p>
          </div>
        ) : (
          <div className="space-y-2">
            {words.map((w) => (
              <div key={w.id}
                   className="border border-gray-100 rounded-xl overflow-hidden transition-all">
                {/* 单词卡片头部 */}
                <button
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{w.word}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{w.translation}</p>
                  </div>
                  <span className={`text-xs text-gray-300 transition-transform duration-200
                    ${expandedId === w.id ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* 展开详情 */}
                {expandedId === w.id && (
                  <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">释义</p>
                      <p className="text-sm text-gray-700">{w.translation}</p>
                    </div>
                    {w.example && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">例句</p>
                        <p className="text-sm text-gray-600 italic leading-relaxed">
                          {w.example}
                        </p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">单词</p>
                      <p className="text-base font-medium text-gray-900">{w.word}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
