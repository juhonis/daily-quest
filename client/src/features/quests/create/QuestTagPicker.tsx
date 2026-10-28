import { useId, useMemo } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { useStore } from '../../../store/useStore'

export function QuestTagPicker({ tags, query, onQueryChange, onChange }: {
  tags: string[]
  query: string
  onQueryChange: (query: string) => void
  onChange: (tags: string[]) => void
}) {
  const id = useId()
  const quests = useStore((state) => state.quests)
  const colors = useStore((state) => state.tagColors)
  const known = useMemo(() => [...new Set([...Object.keys(colors), ...quests.flatMap((quest) => quest.tags ?? []), ...tags])].sort(), [quests, colors, tags])
  const trimmed = query.trim()
  const matches = known.filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 12)

  function add(tag: string) {
    if (!tags.includes(tag)) onChange([...tags, tag])
    onQueryChange('')
  }

  return (
    <>
      {tags.length > 0 && <div className="flex flex-wrap gap-2">{tags.map((tag) => (
        <button key={tag} type="button" aria-label={`Remove tag ${tag}`} onClick={() => onChange(tags.filter((value) => value !== tag))} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: Object.hasOwn(colors, tag) ? colors[tag] : '#3B82F6' }} /><span className="min-w-0 break-all">{tag}</span><X className="h-3.5 w-3.5 shrink-0" />
        </button>
      ))}</div>}
      <div>
        <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-400">Find or create tags</label>
        <input id={id} type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search tags…" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 text-sm" onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); if (trimmed) add(trimmed) }
        }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {matches.map((tag) => <Button key={tag} type="button" variant="ghost" className="max-w-full break-all text-left" aria-label={`Add tag ${tag}`} onClick={() => add(tag)}><Plus className="h-3.5 w-3.5 shrink-0" />{tag}</Button>)}
        {trimmed && !known.includes(trimmed) && <Button type="button" variant="secondary" className="max-w-full break-all text-left" onClick={() => add(trimmed)}><Check className="h-4 w-4 shrink-0" />Create tag “{trimmed}”</Button>}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Choose a tag or press Enter to attach it. Rename tags and change colors in Settings → Quest tags.</p>
    </>
  )
}
