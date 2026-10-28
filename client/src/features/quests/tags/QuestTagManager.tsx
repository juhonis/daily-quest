import { useId, useMemo, useState } from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { TAG_PALETTE } from '../tagColors'

export function QuestTagManager({ onClose }: { onClose: () => void }) {
  const id = useId()
  const quests = useStore((state) => state.quests)
  const colors = useStore((state) => state.tagColors)
  const renameTag = useStore((state) => state.renameTag)
  const deleteTag = useStore((state) => state.deleteTag)
  const setTagColor = useStore((state) => state.setTagColor)
  const tags = useMemo(() => [...new Set([...Object.keys(colors), ...quests.flatMap((quest) => quest.tags ?? [])])].sort(), [quests, colors])
  const [selected, setSelected] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function rename() {
    if (!selected) return
    const trimmed = name.trim()
    if (!trimmed) { setError('Enter a tag name.'); return }
    if (trimmed !== selected && tags.includes(trimmed)) { setError('A tag with this name already exists.'); return }
    try {
      if (trimmed !== selected) renameTag(selected, trimmed)
      setSelected(trimmed)
      setName(trimmed)
      setError('')
    } catch { setError('Could not save this change. Check browser storage and retry.') }
  }

  return (
    <Modal isOpen onClose={onClose} title="Quest tags">
      <p className="mb-4 text-sm leading-relaxed text-slate-400">Rename or recolor tags here. These changes apply to every quest using the tag.</p>
      <div className="space-y-2">
        {tags.map((tag) => <div key={tag} className="rounded-xl border border-slate-800">
          <button type="button" aria-expanded={selected === tag} onClick={() => { setSelected(selected === tag ? null : tag); setName(tag); setError('') }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: Object.hasOwn(colors, tag) ? colors[tag] : '#3B82F6' }} />
            <span className="min-w-0 flex-1 break-words text-sm text-slate-200">{tag}</span>
            <span className="text-xs text-slate-500">{quests.filter((quest) => quest.tags?.includes(tag)).length}</span>
            <ChevronRight className={`h-4 w-4 shrink-0 text-slate-500 ${selected === tag ? 'rotate-90' : ''}`} />
          </button>
          {selected === tag && <div className="space-y-4 border-t border-slate-800 p-3">
            <div><label htmlFor={`${id}-name`} className="mb-1 block text-xs text-slate-400">Tag name</label><div className="flex min-w-0 gap-2"><input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); rename() } }} className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-sm" /><Button type="button" variant="secondary" onClick={rename}>Rename</Button></div></div>
            <fieldset><legend className="mb-2 text-xs text-slate-400">Tag color</legend><div className="flex flex-wrap gap-1">{TAG_PALETTE.map((color) => <button key={color} type="button" aria-label={`Set tag color ${color}`} aria-pressed={colors[tag] === color} onClick={() => { try { setTagColor(tag, color); setError('') } catch { setError('Could not save the color. Check browser storage and retry.') } }} className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${colors[tag] === color ? 'bg-slate-800 ring-1 ring-slate-500' : 'hover:bg-slate-800'}`}><span className="h-5 w-5 rounded-full" style={{ backgroundColor: color }} /></button>)}</div></fieldset>
            <Button type="button" variant="ghost" className="text-red-400" onClick={() => {
              if (!window.confirm(`Remove tag "${tag}" from all quests?`)) return
              try { deleteTag(tag); setSelected(null); setError('') } catch { setError('Could not remove the tag. Check browser storage and retry.') }
            }}><Trash2 className="h-4 w-4" />Delete tag</Button>
          </div>}
        </div>)}
        {tags.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Create tags while editing a quest. They will appear here after saving.</p>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    </Modal>
  )
}
