import { useEffect, useRef, useState } from 'react'
import { Zap } from 'lucide-react'
import type { QuickPreset, RepeatType } from '../../../types'
import { cleanExternalLink, externalLinkError } from '../create/questEditorModel'

type QuestType = 'today' | 'daily' | 'repeating' | 'important'

interface QuestTypeConfig {
  repeat: RepeatType
  rollover: boolean
  repeatConfig?: { interval: number; unit: 'day' | 'week' | 'month' }
}

interface QuickAddBarProps {
  presets: QuickPreset[]
  selectedDate: string
  onInstantAdd: (preset: QuickPreset, config: QuestTypeConfig) => void
  onManageAdd: (preset: QuickPreset) => void
  onManageDelete: (id: string) => void
}

const TYPE_CONFIG: Record<QuestType, (unit?: 'week' | 'month') => QuestTypeConfig> = {
  today: () => ({ repeat: 'none', rollover: false }),
  daily: () => ({ repeat: 'daily', rollover: false }),
  repeating: (unit = 'week') => ({
    repeat: unit === 'week' ? 'weekly' : 'monthly',
    rollover: false,
    repeatConfig: { interval: 1, unit },
  }),
  important: () => ({ repeat: 'none', rollover: true }),
}

const TYPE_LABELS: Record<QuestType, string> = {
  today: 'Once',
  daily: 'Daily',
  repeating: 'Repeat',
  important: 'Carry forward',
}

export function QuickAddBar({
  presets,
  onInstantAdd,
  onManageAdd,
  onManageDelete,
}: QuickAddBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [presetError, setPresetError] = useState('')
  const [questType, setQuestType] = useState<QuestType>('today')
  const [repeatUnit, setRepeatUnit] = useState<'week' | 'month'>('week')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function handleAddPreset() {
    if (!newTitle.trim()) return
    const linkError = externalLinkError(newUrl)
    if (linkError) { setPresetError(linkError); return }
    try { onManageAdd({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      externalUrl: cleanExternalLink(newUrl),
      isUserDefined: true,
      updatedAt: new Date().toISOString(),
    }) } catch { setPresetError('Could not save the preset. Check browser storage and retry.'); return }
    setPresetError('')
    setNewTitle('')
    setNewUrl('')
  }

  function handlePickPreset(preset: QuickPreset) {
    const config = TYPE_CONFIG[questType](questType === 'repeating' ? repeatUnit : undefined)
    onInstantAdd(preset, config)
    setMenuOpen(false)
  }

  const types: QuestType[] = ['today', 'daily', 'repeating', 'important']

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        aria-expanded={menuOpen}
      >
        <Zap className="w-3.5 h-3.5" />
        Quick add
      </button>

      {menuOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-20 max-h-[60dvh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {types.map((t) => (
              <button
                key={t}
                  onClick={() => setQuestType(t)}
                  aria-pressed={questType === t}
                className={`min-h-11 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                  questType === t
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {questType === 'repeating' && (
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
              <span>Repeat:</span>
              <div className="flex gap-1">
                {(['week', 'month'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setRepeatUnit(u)}
                    className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                      repeatUnit === u
                        ? 'bg-slate-600 text-white'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {u}ly
                  </button>
                ))}
              </div>
            </div>
          )}

          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickPreset(p)}
                  className="min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2 mb-2">
              No presets yet. Add one below.
            </p>
          )}

          <button
            onClick={() => setManageOpen(!manageOpen)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {manageOpen ? 'Hide' : 'Manage'} presets ({presets.length})
          </button>
          {manageOpen && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  aria-label="Preset title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Preset title"
                  className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  inputMode="url"
                  aria-label="Preset URL"
                  value={newUrl}
                  onChange={(e) => { setNewUrl(e.target.value); setPresetError('') }}
                  placeholder="URL"
                  className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddPreset}
                  className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {presetError && <p role="alert" className="text-xs text-red-300">{presetError}</p>}
              <div className="space-y-1">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex-1 truncate">{p.title}</span>
                    {p.externalUrl && (
                      <span className="text-slate-600 truncate max-w-[100px]">{p.externalUrl}</span>
                    )}
                    <button
                      onClick={() => onManageDelete(p.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                      aria-label={`Delete ${p.title}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
