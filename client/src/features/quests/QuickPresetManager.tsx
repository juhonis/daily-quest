import { useState } from 'react'
import type { QuickPreset } from '../../types'
import { Button } from '../../components/ui/Button'
import { Plus, X } from 'lucide-react'

interface QuickPresetManagerProps {
  presets: QuickPreset[]
  onAdd: (preset: QuickPreset) => void
  onDelete: (id: string) => void
}

export function QuickPresetManager({ presets, onAdd, onDelete }: QuickPresetManagerProps) {
  const [expanded, setExpanded] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  function handleAdd() {
    if (!newTitle.trim()) return
    onAdd({
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      externalUrl: newUrl.trim() || undefined,
      isUserDefined: true,
    })
    setNewTitle('')
    setNewUrl('')
  }

  return (
    <div className="mt-4 border-t border-slate-700 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {expanded ? 'Hide' : 'Manage'} presets ({presets.length})
      </button>

      {expanded && (
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
              placeholder="URL (optional)"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button variant="icon" onClick={handleAdd} aria-label="Add preset">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex-1 truncate">{p.title}</span>
                {p.externalUrl && (
                  <span className="text-slate-600 truncate max-w-[120px]">{p.externalUrl}</span>
                )}
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                  aria-label={`Delete ${p.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
