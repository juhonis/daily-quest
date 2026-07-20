import { useState } from 'react'
import type { QuickPreset } from '../../types'

interface QuickAddBarProps {
  presets: QuickPreset[]
  selectedDate: string
  onInstantAdd: (preset: QuickPreset) => void
  onManageAdd: (preset: QuickPreset) => void
  onManageDelete: (id: string) => void
}

export function QuickAddBar({
  presets,
  onInstantAdd,
  onManageAdd,
  onManageDelete,
}: QuickAddBarProps) {
  const [manageOpen, setManageOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  function handleAddPreset() {
    if (!newTitle.trim()) return
    onManageAdd({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      externalUrl: newUrl.trim() || undefined,
      isUserDefined: true,
    })
    setNewTitle('')
    setNewUrl('')
  }

  return (
    <div className="mb-4">
      {presets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin mb-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onInstantAdd(p)}
              className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {p.title}
            </button>
          ))}
        </div>
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
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Preset title"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="URL"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddPreset}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex-1 truncate">{p.title}</span>
                {p.externalUrl && (
                  <span className="text-slate-600 truncate max-w-[120px]">{p.externalUrl}</span>
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
  )
}
