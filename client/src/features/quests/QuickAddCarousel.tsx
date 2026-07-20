import type { QuickPreset } from '../../types'

interface QuickAddCarouselProps {
  presets: QuickPreset[]
  onInstantAdd: (preset: QuickPreset) => void
}

export function QuickAddCarousel({ presets, onInstantAdd }: QuickAddCarouselProps) {
  if (presets.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Quick Add
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onInstantAdd(p)}
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {p.icon && <span className="mr-1">{p.icon}</span>}
            {p.title}
          </button>
        ))}
      </div>
    </div>
  )
}
