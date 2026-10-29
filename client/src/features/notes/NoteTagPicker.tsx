import { useId, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Button } from '../../components/ui/Button'

export function NoteTagPicker({ tags, query, onQuery, onChange }: { tags: string[]; query: string; onQuery: (value: string) => void; onChange: (tags: string[]) => void }) {
  const id = useId()
  const notes = useStore((state) => state.notes)
  const colors = useStore((state) => state.noteTagColors)
  const known = useMemo(() => [...new Set([...notes.flatMap((note) => note.tags ?? []), ...Object.keys(colors), ...tags])].sort(), [notes, colors, tags])
  const trimmed = query.trim()
  const matches = known.filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 12)
  function add(tag: string) { if (!tags.includes(tag)) onChange([...tags, tag]); onQuery('') }
  return <div className="space-y-3">
    {!!tags.length && <div className="flex flex-wrap gap-2">{tags.map((tag) => <button type="button" key={tag} onClick={() => onChange(tags.filter((item) => item !== tag))} aria-label={`Remove note tag ${tag}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-slate-800 px-3 text-sm text-slate-300"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: Object.hasOwn(colors, tag) ? colors[tag] : '#3B82F6' }} /><span className="min-w-0 break-all">{tag}</span><X className="h-3.5 w-3.5 shrink-0" /></button>)}</div>}
    <div><label htmlFor={id} className="mb-1 block text-xs text-slate-400">Find or create note tags</label><input id={id} type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search note tags…" className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (trimmed) add(trimmed) } }} /></div>
    <div className="flex flex-wrap gap-2">{matches.map((tag) => <Button key={tag} type="button" variant="ghost" className="max-w-full break-all text-left" aria-label={`Add note tag ${tag}`} onClick={() => add(tag)}><Plus className="h-3.5 w-3.5 shrink-0" />{tag}</Button>)}{trimmed && !known.includes(trimmed) && <Button type="button" variant="secondary" className="max-w-full break-all text-left" onClick={() => add(trimmed)}>Create note tag “{trimmed}”</Button>}</div>
  </div>
}
