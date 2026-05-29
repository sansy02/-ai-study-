/**
 * 功能开关组件 — 极简滑动开关
 */
interface FeatureToggleProps {
  label: string
  description?: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export default function FeatureToggle({ label, description, enabled, onChange }: FeatureToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <span className="text-sm text-gray-800">{label}</span>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200
          focus:outline-none
          ${enabled ? "bg-gray-900" : "bg-gray-200"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow
            transform transition-transform duration-200
            ${enabled ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  )
}
