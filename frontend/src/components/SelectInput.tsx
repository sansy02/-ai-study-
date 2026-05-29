/**
 * 下拉选择 + 手动输入组件
 * 预设选项 + 可自由输入
 */
import { useState, useRef, useEffect } from "react"

interface SelectInputProps {
  label: string
  value: string
  options: string[]
  placeholder?: string
  onChange: (value: string) => void
}

export default function SelectInput({ label, value, options, placeholder, onChange }: SelectInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-lg focus-within:border-gray-400 transition-colors">
        <input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            setInputValue(e.target.value)
            onChange(e.target.value)
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 px-3 py-2.5 text-sm text-gray-800 bg-transparent outline-none rounded-lg"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 text-gray-400 hover:text-gray-600"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {isOpen && options.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-sm max-h-40 overflow-auto">
          {options.map((opt) => (
            <li
              key={opt}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setInputValue(opt)
                onChange(opt)
                setIsOpen(false)
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
